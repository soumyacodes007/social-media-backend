const express = require('express');
const http = require('http'); // 📌 Added for Socket.IO
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
require('dotenv').config();
const Chat = require('../models/chat');
const Post = require('../models/post');
const Note = require('../models/note');

const app = express();
const server = http.createServer(app); // wrap for sockets
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
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
  if (!conn) {
    conn = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
      .then(() => mongoose.connection)
      .catch(err => { conn = null; console.error('MongoDB Connection Error:', err); });
    await conn;
  }
  return conn;
};
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB middleware error:", err);
    res.status(503).json({ message: "Service Unavailable: Could not connect to DB." });
  }
});;

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
// DELETE /api/chats/delete-all
app.delete('/api/chats/delete-all', async (req, res) => {
  try {
    await Chat.deleteMany({});
    res.status(200).json({ message: 'All chats deleted successfully.' });
  } catch (error) {
    console.error("Error deleting all chats:", error);
    res.status(500).json({ message: 'Failed to delete all chats', error: error.message });
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

// POST /api/chats
// POST /api/chats
app.post('/api/chats', async (req, res) => {
  const { sender, receiver, text } = req.body; // ✅ Extract from req.body

  if (!sender || !receiver || !text) {
    return res.status(400).json({ message: 'Missing sender, receiver, or text' });
  }

  const participants = sender === receiver ? [sender] : [sender, receiver].sort();

  try {
    let chat = await Chat.findOne({ participants });

    if (!chat) {
      chat = new Chat({ participants, messages: [] });
    }

    chat.messages.push({ sender, text });
    const saved = await chat.save();
    res.status(200).json(saved);
  } catch (error) {
    console.error("Error saving chat:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/chats/:user1/:user2
app.delete('/api/chats/:user1/:user2', async (req, res) => {
  const { user1, user2 } = req.params;
  const participants = [user1, user2].sort();

  try {
    const deleted = await Chat.findOneAndDelete({ participants });
    if (!deleted) {
      return res.status(404).json({ message: "Chat not found." });
    }
    res.status(200).json({ message: "Chat deleted successfully." });
  } catch (err) {
    console.error("Error deleting chat:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===== SOCKET.IO REAL-TIME CHAT =====
io.on('connection', socket => {
  console.log('✅ Socket connected:', socket.id);

  socket.on('join_chat', async ({ sender, receiver }) => {
    const room = [sender, receiver].sort().join('-');
    socket.join(room);

    let chat = await Chat.findOne({
      participants: { $all: [sender, receiver], $size: 2 }
    });
    socket.emit('load_messages', chat?.messages || []);
  });

  socket.on('send_message', async ({ sender, receiver, text }) => {
    const room = [sender, receiver].sort().join('-');

    let chat = await Chat.findOne({
      participants: { $all: [sender, receiver], $size: 2 }
    });
    const message = { sender, receiver, text };

    if (!chat) {
      chat = new Chat({ participants: [sender, receiver], messages: [message] });
    } else {
      chat.messages.push(message);
    }
    await chat.save();

    io.to(room).emit('receive_message', message);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});
// ===== END SOCKET.IO BLOCK =====

// GET /api/chats/:userPhone
app.get('/api/chats/:userPhone', async (req, res) => {
  const { userPhone } = req.params;

  try {
    const chats = await Chat.find({
      participants: { $in: [userPhone] }
    });

    // Filter out self-chats (where both participants are the same user)
    const filteredChats = chats.filter(chat => {
      // either more than 1 participant, or if self-chat, skip
      return !(chat.participants.length === 1 && chat.participants[0] === userPhone);
    });

    res.status(200).json(filteredChats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ message: 'Error fetching chats', error: error.message });
  }
});






module.exports = app;
