// api/index.js

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
require('dotenv').config();

const Post = require('../models/post'); // 👈 Note the path change: ../
const app = express();

// Cloudinary Config...
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // This might not be needed here anymore, but doesn't hurt

// MULTER SETUP
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// DATABASE CONNECTION
// It's good practice to manage the connection state
let conn = null;
const connectDB = async () => {
  if (conn == null) {
    conn = mongoose.connect(process.env.MONGO_URI).then(() => {
      console.log('✅ New MongoDB connection established!');
      return mongoose.connection;
    }).catch(err => console.error(err));
    await conn;
  }
  return conn;
};
// Middleware to ensure DB is connected before handling requests
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// API ROUTES
app.get('/api/posts', async (req, res) => {
    // ... your GET route code ...
});

app.post('/api/posts', upload.single('image'), async (req, res) => {
    // ... your POST route code ...
});



/*
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});
*/

// ✅ EXPORT THE EXPRESS APP FOR VERCEL
module.exports = app;