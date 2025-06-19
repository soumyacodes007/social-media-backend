// index.js
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config(); // Loads the .env file contents into process.env

// Import the Post model
const Post = require('./models/post');

const app = express();
const PORT = process.env.PORT || 3001;


// This allows our app to accept and parse JSON from requests
app.use(express.json());

// DATABASE CONNECTION 
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log(' MongoDB connected successfully!'))
.catch((err) => console.error(' MongoDB connection error:', err));


// API endpoints

// GET /api/posts - Fetch all posts for the feed
app.get('/api/posts', async (req, res) => {
  try {
    // Find all posts and sort them by creation date (newest first)
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posts', error: error });
  }
});

// POST /api/posts - Create a new post
app.post('/api/posts', async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ message: 'Request body is missing or not parsed as JSON.' });
  }
  const { username, userProfileUrl, imageUrl, caption } = req.body;

  // Basic validation
  if (!username || !imageUrl || !caption) {
    return res.status(400).json({ message: 'Username, imageUrl, and caption are required.' });
  }

  try {
    const newPost = new Post({
      username,
      userProfileUrl,
      imageUrl,
      caption,
    });

    const savedPost = await newPost.save(); // Save the post to the database
    res.status(201).json(savedPost); // Send the new post back as a response
  } catch (error) {
    res.status(500).json({ message: 'Error creating post', error: error });
  }
});


// start the server
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});