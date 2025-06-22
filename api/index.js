const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");
require("dotenv").config();
const serverless = require("serverless-http");

const Chat = require("../models/chat");
const Stories = require("./models/Stories");
const Post = require("../models/post");
const Note = require("../models/note");

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

    await conn;
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

// Routes (exactly the same logic you had)
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

    const newPost = new Post({ ...req.body, imageUrl });
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
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

// Local development only (optional)
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// Vercel serverless export

module.exports = serverless(app);



