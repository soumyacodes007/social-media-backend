// index.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
// Import Cloudinary and remove AWS
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const Post = require('./models/post');
const app = express();
const PORT = process.env.PORT || 3001;

//  (2) Cloudinary Configuration 
// This configures the Cloudinary SDK with your credentials from the .env file
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//  MIDDLEWARE
app.use(express.json());

//  MULTER SETUP 
// We'll store the file in memory before uploading to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//  DATABASE CONNECTION 
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected!'))
  .catch((err) => console.error(' MongoDB connection error:', err));


// API ROUTES 

// GET /api/posts - Fetch all posts for the feed (No changes needed here)
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).json({ message: 'Error fetching posts', error: error });
    }
});

// POST /api/posts - Create a new post
// The main logic change is in this route
app.post('/api/posts', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded.' });
    }

    // Convert the buffer to a Data URI, which Cloudinary can accept
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    // Upload the image to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "social_media_posts", // Optional: organizes uploads into a folder
    });

    // `result.secure_url` contains the public URL of the uploaded image
    const imageUrl = result.secure_url; 

    // Get the rest of the data from the request body
    const { username, caption, userProfileUrl } = req.body;

    if (!username || !caption) {
      return res.status(400).json({ message: 'Username and caption are required.' });
    }

    const newPost = new Post({
      username,
      caption,
      imageUrl: imageUrl, // Use the URL from the Cloudinary result!
      userProfileUrl: userProfileUrl || '',
    });

    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
    
  } catch (error) {
    console.error("Server error creating post:", error);
    res.status(500).json({ message: 'Error creating post', error: error });
  }
});


// START SERVER 
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});