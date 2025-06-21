// ===== BACKEND CODE (Express + MongoDB) =====

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
require('dotenv').config();

const Post = require('../models/post');
const Note = require('../models/note');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

let conn = null;
const connectDB = async () => {
  if (conn == null) {
    conn = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    }).then(() => mongoose.connection);
    await conn;
  }
  return conn;
};

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(503).json({ message: "DB connection failed." });
  }
});

app.get('/', (req, res) => {
  res.json({ message: "API is live." });
});

// ====== NOTES ROUTES ======

app.get('/api/notes', async (req, res) => {
  try {
    const now = new Date();
    const notes = await Note.find({ expiresAt: { $gt: now } }).sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notes', error: error.message });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { name, text, userPhone } = req.body;
    if (!name || !text) {
      return res.status(400).json({ message: 'Name and text are required.' });
    }

    const newNote = new Note({
      name,
      text,
      userPhone,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000)
    });

    const saved = await newNote.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: 'Error saving note', error: error.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Note.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Note not found.' });
    res.status(200).json({ message: 'Deleted', deleted });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting note', error: error.message });
  }
});

module.exports = app;


// ===== models/note.js =====

const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  name: String,
  text: String,
  userPhone: String,
  expiresAt: { type: Date, expires: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Note", noteSchema);
