const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
require('dotenv').config();

const Post = require('../models/post');
const Note = require('../models/note'); // ✅ New line to import Note model
const app = express();

// Enable CORS
app.use(cors());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer config (store file in memory)
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
    console.log('Creating new MongoDB connection...');
    conn = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    }).then(() => {
      console.log('✅ MongoDB Connected!');
      return mongoose.connection;
    }).catch(err => {
      console.error('MongoDB Connection Error:', err);
      conn = null;
    });

    await conn;
  } else {
    console.log('Re-using existing MongoDB connection.');
  }
  return conn;
};

// DB connection middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("DB middleware error:", error);
    res.status(503).json({ message: "Service Unavailable: Could not connect to DB." });
  }
});

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({ message: "Welcome to the Social Media API. It is live and running." });
});

// GET /api/posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ message: 'Error fetching posts', error: error.message });
  }
});

// POST /api/posts
app.post('/api/posts', upload.single('image'), async (req, res) => {
  try {
    let imageUrl = "";

    // ✅ Upload to Cloudinary only if image is provided
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;

      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "social_media_posts",
      });

      imageUrl = result.secure_url;
    }

    // Extract data
    const {
      username,
      caption,
      name,
      bio,
      interests,
      website,
      music,
      phone,
      password,
      email,
      gender,
      userProfileUrl
    } = req.body;

    // Save to DB
    const newPost = new Post({
      username: username || "",
      caption: caption || "",
      imageUrl,
      userProfileUrl: userProfileUrl || '',
      name,
      bio,
      interests,
      website,
      music,
      phone,
      password,
      email,
      gender,
    });

    const savedPost = await newPost.save();
    res.status(201).json(savedPost);

  } catch (error) {
    console.error("❌ Server error creating post:", error);
    res.status(500).json({ message: 'Error creating post', error: error.message });
  }
});

// PATCH /api/posts/:id
app.patch('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Post ID format.' });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ message: 'Error updating post', error: error.message });
  }
});

// DELETE /api/posts/:id
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Post ID format.' });
    }

    const deletedPost = await Post.findByIdAndDelete(id);

    if (!deletedPost) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    res.status(200).json({
      message: 'Post deleted successfully.',
      deletedPost
    });

  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: 'Error deleting post', error: error.message });
  }
});

// ===== Notes Routes =====

// GET /api/notes
app.get('/api/notes', async (req, res) => {
  try {
    const now = new Date();
    const notes = await Note.find({ expiresAt: { $gt: now } }).sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ message: 'Error fetching notes', error: error.message });
  }
});

// POST /api/notes
app.post('/api/notes', async (req, res) => {
  try {
    const { name, text } = req.body;
    if (!name || !text) {
      return res.status(400).json({ message: 'Name and text are required.' });
    }

    const newNote = new Note({
      name,
      text,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000)
    });

    const saved = await newNote.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("Error saving note:", error);
    res.status(500).json({ message: 'Error saving note', error: error.message });
  }
});

// DELETE /api/notes/:id
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Note ID format.' });
    }

    const deleted = await Note.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Note not found.' });
    }

    res.status(200).json({ message: 'Note deleted successfully', deleted });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ message: 'Error deleting note', error: error.message });
  }
});

module.exports = app;
