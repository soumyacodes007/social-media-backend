const express = require("express");

const http = require("http"); // ✅ YEH ADD KAREIN
const { Server } = require("socket.io"); // ✅ YEH ADD KAREIN
// ...baaki ke imports
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");
require("dotenv").config();
// The serverless-http module is no longer needed, but it's okay to leave the require statement.
// const serverless = require("serverless-http");


// At the top of api/index.js with other model imports
// ... other requires

const Like = require("../models/like"); 
const Share = require("../models/share"); 

// ... other requires
const Chat = require("../models/chat");
const Story = require("../models/Stories");
const Post = require("../models/post");
const Note = require("../models/note");
const Upload = require("../models/upload");
const User = require("../models/user"); // ✅ Import it
const Comment = require("../models/comment");

const app = express();

const server = http.createServer(app);
const io = new Server(server, {         
  cors: {
    origin: "*", 
  },
});
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Cloudinary config
cloudinary.config({
cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
api_key: process.env.CLOUDINARY_API_KEY,
api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MongoDB connection caching
let conn = null;
const connectDB = async () => {
if (conn == null) {
console.log("Creating new MongoDB connection...");
conn = mongoose
.connect(process.env.MONGO_URI, {
serverSelectionTimeoutMS: 5000,
})
.then(() => {
console.log("✅ MongoDB Connected!");
return mongoose.connection;
})
.catch((err) => {
console.error("MongoDB Connection Error:", err);
conn = null;
});

} else {
console.log("Re-using existing MongoDB connection.");
}
return conn;
};

app.use(async (req, res, next) => {
try {
await connectDB();
next();
} catch (error) {
console.error("DB middleware error:", error);
res.status(503).json({ message: "Service Unavailable: Could not connect to DB." });
}
});

const onlineUsers = {}; // phone -> socket.id

io.on("connection", (socket) => {
  console.log("✅ New user connected:", socket.id);

  // Join room by combined roomId (sorted phones)
  socket.on("join", (roomId) => {
    socket.join(roomId);
    console.log(`📲 Joined room: ${roomId}`);
  });

  
socket.on("user_online", (phone) => {
  onlineUsers[phone] = socket.id;
  console.log(`🟢 ${phone} is online`);

  io.emit("presence_update", { phone, isOnline: true });
});

  // Send + Save message
  socket.on("sendMessage", async (data) => {
    const { sender, receiver, text } = data;
    const timestamp = Date.now();
    const participants = sender === receiver ? [sender] : [sender, receiver].sort();
    const roomId = participants.join("-");

    try {
      // 1. Find or create chat
      let chat = await Chat.findOne({ participants });

      if (!chat) {
        chat = new Chat({ participants, messages: [] });
      }

      // 2. Add new message
      const newMessage = { sender, text, timestamp };
      chat.messages.push(newMessage);
      await chat.save();

      // 3. Emit to both users in the room
      io.to(roomId).emit("receive_message", newMessage);
      console.log(`📤 Message sent to room ${roomId}`);
    } catch (err) {
      console.error("❌ Error saving chat message:", err.message);
    }
  });

  // Cleanup
 socket.on("disconnect", async () => {
  console.log("❌ User disconnected:", socket.id);

  const phone = Object.keys(onlineUsers).find(
    (key) => onlineUsers[key] === socket.id
  );

  if (phone) {
    delete onlineUsers[phone];

    const lastSeen = new Date();

    // Update lastSeen in your User schema if applicable
    try {
      await User.updateOne({ phone }, { isOnline: false, lastSeen });
    } catch (err) {
      console.error("Failed to update lastSeen:", err.message);
    }

    io.emit("presence_update", {
      phone,
      isOnline: false,
      lastSeen,
    });
  }
});


// --- Routes ---
app.get("/", (req, res) => {
res.status(200).json({ message: "Welcome to the Social Media API. It is live and running." });
});

app.get("/api/posts", async (req, res) => {
try {
const posts = await Post.find().sort({ createdAt: -1 });
res.status(200).json(posts);
} catch (error) {
res.status(500).json({ message: "Error fetching posts", error: error.message });
}
});

app.post("/api/posts", upload.single("image"), async (req, res) => {
  try {
    let imageUrl = "";
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "social_media_posts",
      });
      imageUrl = result.secure_url;
    }

    const { caption, creator } = req.body;

    const newPost = new Post({
      caption,
      imageUrl,
      creator,
      createdAt: new Date(),
    });

    const savedPost = await newPost.save();
    res.status(201).json(savedPost);

  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating post", error: error.message });
  }
});


app.patch("/api/posts/:id", async (req, res) => {
try {
const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, {
new: true,
runValidators: true,
});
res.status(200).json(updatedPost);
} catch (error) {
res.status(500).json({ message: "Error updating post", error: error.message });
}
});

app.delete("/api/posts/:id", async (req, res) => {
try {
const deletedPost = await Post.findByIdAndDelete(req.params.id);
res.status(200).json({ message: "Post deleted successfully.", deletedPost });
} catch (error) {
res.status(500).json({ message: "Error deleting post", error: error.message });
}
});

app.get("/api/notes", async (req, res) => {
try {
const now = new Date();
const notes = await Note.find({ expiresAt: { $gt: now } }).sort({ createdAt: -1 });
res.status(200).json(notes);
} catch (error) {
res.status(500).json({ message: "Error fetching notes", error: error.message });
}
});

app.post("/api/notes", async (req, res) => {
try {
const { name, text } = req.body;
if (!name || !text) return res.status(400).json({ message: "Name and text are required." });
const newNote = new Note({ name, text, expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) });
const saved = await newNote.save();
res.status(201).json(saved);
} catch (error) {
res.status(500).json({ message: "Error saving note", error: error.message });
}
});

app.delete("/api/notes/:id", async (req, res) => {
try {
const deleted = await Note.findByIdAndDelete(req.params.id);
res.status(200).json({ message: "Note deleted successfully", deleted });
} catch (error) {
res.status(500).json({ message: "Error deleting note", error: error.message });
}
});

app.delete("/api/chats/delete-all", async (req, res) => {
try {
await Chat.deleteMany({});
res.status(200).json({ message: "All chats deleted successfully." });
} catch (error) {
res.status(500).json({ message: "Failed to delete all chats", error: error.message });
}
});

app.post("/api/chats", async (req, res) => {
  const { sender, receiver, text } = req.body;
  const participants = sender === receiver ? [sender] : [sender, receiver].sort();

  try {
    let chat = await Chat.findOne({ participants });
    
    if (!chat) {
      chat = new Chat({ participants, messages: [] });
    } else if (!Array.isArray(chat.messages)) {
      chat.messages = []; // Fix if messages was never initialized
    }

    chat.messages.push({ sender, text });

    const saved = await chat.save();
    res.status(200).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});



app.delete("/api/chats/:user1/:user2", async (req, res) => {
const participants = [req.params.user1, req.params.user2].sort();
try {
const deleted = await Chat.findOneAndDelete({ participants });
if (!deleted) return res.status(404).json({ message: "Chat not found." });
res.status(200).json({ message: "Chat deleted successfully." });
} catch (err) {
res.status(500).json({ message: "Server error", error: err.message });
}
});

// Delete a single message between two users based on timestamp
app.delete("/api/chats/:user1/:user2/:index", async (req, res) => {
  const { user1, user2, index } = req.params;
  const participants = [user1, user2].sort();

  try {
    const chat = await Chat.findOne({ participants });

    if (!chat) return res.status(404).json({ message: "Chat not found." });

    if (!chat.messages[index]) {
      return res.status(400).json({ message: "Invalid message index." });
    }

    chat.messages.splice(index, 1);
    await chat.save();

    res.status(200).json({ message: "Message deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});




// Update user status
app.post("/api/user/status", async (req, res) => {
  const { phone, isOnline } = req.body;
  try {
    const update = { isOnline };
    if (!isOnline) update.lastSeen = new Date();

    const user = await User.findOneAndUpdate(
      { phone },
      update,
      { new: true, upsert: true }
    );
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Status update failed", error: err.message });
  }
});

// Get a user's status
app.get("/api/users/:phone", async (req, res) => {
  try {
    const user = await User.findOne({ phone: req.params.phone });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user", error: err.message });
  }
});


app.get("/api/chats/:userPhone", async (req, res) => {
const { userPhone } = req.params;
try {
const chats = await Chat.find({
$or: [
{ participants: [userPhone] },
{ participants: { $all: [userPhone], $size: 2 } },
],
});
res.status(200).json(chats);
} catch (error) {
res.status(500).json({ message: "Error fetching chats", error: error.message });
}
});

app.post("/api/stories", upload.single("media"), async (req, res) => {
try {
let mediaUrl = "";
if (req.file) {
const b64 = Buffer.from(req.file.buffer).toString("base64");
const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
const result = await cloudinary.uploader.upload(dataURI, {
folder: "stories",
resource_type: "auto",
});
mediaUrl = result.secure_url;
}
const { user, type } = req.body;
const newStory = await Story.create({ user, mediaUrl, type });
res.status(201).json(newStory);
} catch (err) {
res.status(500).json({ error: err.message });
}
});

app.get("/api/stories", async (req, res) => {
try {
const now = new Date();
const stories = await Story.find({ expiresAt: { $gt: now } })
.populate("user", "name profilePic")
.sort({ createdAt: -1 });
res.json(stories);
} catch (err) {
res.status(500).json({ error: err.message });
}
});
// GET all uploads
app.get("/api/uploads", async (req, res) => {
  try {
    const uploads = await Upload.find()
      .sort({ uploadedAt: -1 })
      // .populate("uploader", "name profilePic"); // optional, if you have users

    res.status(200).json(uploads);
  } catch (error) {
    res.status(500).json({ message: "Error fetching uploads", error: error.message });
  }
});


// POST a new upload

app.post("/api/uploads", upload.single("media"), async (req, res) => {
  try {
    let fileUrl = "";
    let fileType = "";
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "uploads",
        resource_type: "auto",
      });
      fileUrl = result.secure_url;
      fileType = req.file.mimetype;
    }

    const { filename, uploader, caption } = req.body; // <-- get caption
    const uploadData = {
      filename: filename || (req.file ? req.file.originalname : undefined),
      uploadedAt: new Date(),
      uploaderPhone: req.body.uploaderPhone,
      caption: caption || "", // <-- save caption
    };

    if (fileType.startsWith("image")) uploadData.imageUrl = fileUrl;
    else if (fileType.startsWith("video")) uploadData.videoUrl = fileUrl;
    else if (fileType.startsWith("audio")) uploadData.audioUrl = fileUrl;

    const newUpload = await Upload.create(uploadData);

    res.status(201).json(newUpload);
  } catch (error) {
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});


// DELETE an upload by ID
app.delete("/api/uploads/:id", async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id);
    if (!upload) return res.status(404).json({ message: "Upload not found." });

    // Extract Cloudinary public ID (if you want to delete from Cloudinary)
    const urlParts = upload.url.split("/");
    const publicIdWithExt = urlParts[urlParts.length - 1];
    const publicId = `uploads/${publicIdWithExt.split(".")[0]}`; // assumes folder = 'uploads'

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });

    // Delete from DB
    await Upload.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Upload deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting upload", error: error.message });
  }
});

app.post("/api/uploads/profileimage", upload.single("profileImage"), async (req, res) => {
  try {
    let fileUrl = "";
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "profile_images",
        resource_type: "image",
      });
      fileUrl = result.secure_url;
    }

    // Save a new Upload entry with profileImage for this user
    const uploadData = {
      uploaderPhone: req.body.phone,
      profileImage: fileUrl,
      uploadedAt: new Date(),
    };

    const newProfileUpload = await Upload.create(uploadData);

    res.status(201).json(newProfileUpload);
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile image", error: error.message });
  }
});

// Get comments for a post

app.get("/api/comments/:postId", async (req, res) => {
  const { postId } = req.params;

  console.log("➡️  GET Comments for postId:", postId); // ✅ LOG

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ message: "Invalid postId format." });
  }

  try {
    const comments = await Comment.find({ postId })
      .sort({ createdAt: -1 })
      .populate("userId", "name profilePic"); // ✅ ADD THIS LINE TO GET USER INFO

    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching comments", error: error.message });
  }
});

// Post a new comment
app.post("/api/comments", async (req, res) => {
  console.log("➡️  POST Comment Body:", req.body); // ✅ LOG

  try {
    const { postId, userId, text } = req.body;

    if (!postId || !userId || !text) {
      return res.status(400).json({ message: "postId, userId and text are required." });
    }

    const newComment = await Comment.create({ postId, userId, text });
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: "Error creating comment", error: error.message });
  }
});

app.get("/api/comments/test", (req, res) => {
  res.status(200).json({ msg: "✅ test route working" });
});

// Add these routes into your api/index.js file

// --- LIKE / UNLIKE A POST (Using separate Like model) ---
app.post("/api/like", async (req, res) => {
  try {
    const { postId, userId } = req.body;

    if (!postId || !userId) {
      return res.status(400).json({ message: "postId and userId are required." });
    }

    // Check if the like already exists
    const existingLike = await Like.findOne({ postId, userId });

    if (existingLike) {
      // If it exists, UNLIKE by deleting the like document
      await Like.findByIdAndDelete(existingLike._id);
      res.status(200).json({ message: "Post unliked successfully." });
    } else {
      // If it doesn't exist, LIKE by creating a new like document
      const newLike = new Like({ postId, userId });
      await newLike.save();
      res.status(201).json({ message: "Post liked successfully.", like: newLike });
    }
  } catch (error) {
    // This will catch the duplicate key error if two requests try to like at the same time
    if (error.code === 11000) {
      return res.status(409).json({ message: "Like already exists." });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// --- GET ALL LIKES FOR A POST (To get the count and list of users) ---
app.get("/api/posts/:postId/likes", async (req, res) => {
  try {
    const { postId } = req.params;
    const likes = await Like.find({ postId }).populate("userId", "name profilePic");
    // The total count is just the length of the array
    const likeCount = likes.length;

    res.status(200).json({
      count: likeCount,
      users: likes.map(like => like.userId) // Return a clean array of user objects
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// --- SHARE A POST (Using separate Share model) ---
app.post("/api/share", async (req, res) => {
  try {
    const { postId, userId } = req.body;

    if (!postId || !userId) {
      return res.status(400).json({ message: "postId and userId are required." });
    }

    // Every share is a new event, so we just create a new document
    const newShare = new Share({ postId, userId });
    await newShare.save();

    res.status(201).json({ message: "Post shared successfully.", share: newShare });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// --- GET SHARE COUNT FOR A POST ---
app.get("/api/posts/:postId/shares", async (req, res) => {
  try {
    const { postId } = req.params;

    // Use .countDocuments() for a very efficient way to get the total count
    const shareCount = await Share.countDocuments({ postId });

    res.status(200).json({ count: shareCount });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// --- FOLLOW / UNFOLLOW A USER ---
app.post("/api/users/follow", async (req, res) => {
  try {
    // The user who is clicking the "follow" button
    const { followerId } = req.body;
    // The user whose profile is being viewed and followed
    const { followingId } = req.body;

    if (!followerId || !followingId) {
      return res.status(400).json({ message: "followerId and followingId are required." });
    }
    if (followerId === followingId) {
      return res.status(400).json({ message: "Users cannot follow themselves." });
    }

    const follower = await User.findById(followerId);
    const userToFollow = await User.findById(followingId);

    if (!follower || !userToFollow) {
      return res.status(404).json({ message: "One or both users not found." });
    }

    // Check if the follower is already following the user
    const isAlreadyFollowing = follower.following.includes(followingId);

    if (isAlreadyFollowing) {
      // --- IF YES, THEN UNFOLLOW ---
      // 1. Remove userToFollow from the follower's 'following' list
      follower.following.pull(followingId);
      // 2. Remove follower from the userToFollow's 'followers' list
      userToFollow.followers.pull(followerId);

      await follower.save();
      await userToFollow.save();

      return res.status(200).json({ message: "User unfollowed successfully." });

    } else {
      // --- IF NO, THEN FOLLOW ---
      // 1. Add userToFollow to the follower's 'following' list
      follower.following.push(followingId);
      // 2. Add follower to the userToFollow's 'followers' list
      userToFollow.followers.push(followerId);

      await follower.save();
      await userToFollow.save();

      return res.status(200).json({ message: "User followed successfully." });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// --- GET A USER'S LIST OF FOLLOWERS ---
app.get("/api/users/:id/followers", async (req, res) => {
  try {
    const { id } = req.params;
    // Find the user and populate their followers list
    // We only get the 'name' and 'profileImage' of each follower
    const user = await User.findById(id).populate("followers", "name profileImage");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json(user.followers);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// --- GET THE LIST OF USERS A USER IS FOLLOWING ---
app.get("/api/users/:id/following", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate("following", "name profileImage");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json(user.following);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});



// ===================================================================
// START THE SERVER - This is the corrected block for Render
// ===================================================================


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
