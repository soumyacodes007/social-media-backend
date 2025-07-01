const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");
require("dotenv").config();
// The serverless-http module is no longer needed, but it's okay to leave the require statement.
// const serverless = require("serverless-http");

const Chat = require("../models/chat");
const Story = require("../models/Stories");
const Post = require("../models/post");
const Note = require("../models/note");
const Upload = require("../models/upload");


const app = express();

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
const result = await cloudinary.uploader.upload(dataURI, { folder: "social_media_posts" });
imageUrl = result.secure_url;
}

} catch (error) {
res.status(500).json({ message: "Error creating post", error: error.message });
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
if (!chat) chat = new Chat({ participants, messages: [] });
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

    const { filename, uploader } = req.body;
    const uploadData = {
      filename: filename || req.file.originalname,
      uploadedAt: new Date(),
      uploader,
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


// ===================================================================
// START THE SERVER - This is the corrected block for Render
// ===================================================================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
// eta baptics er vetor hobe
console.log(`✅ Server is listening on port ${PORT}`);
});
