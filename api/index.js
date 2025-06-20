//  api/index.js

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors'); // <-- Import CORS
require('dotenv').config();

// Important: The path is now relative to the `api` folder
const Post = require('../models/post'); 

const app = express();



// 1. Enable CORS for all requests
// This is essential for your React Native app to be able to call the API
app.use(cors());

// 2. Body Parsers
app.use(express.json()); // To parse JSON bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded bodies

// 3. Multer setup for file uploads
// We'll store the file in memory before uploading to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


// 
// This pattern prevents new connections from being made on every serverless function invocation
let conn = null;
const connectDB = async () => {
  if (conn == null) {
    console.log('Creating new MongoDB connection...');
    conn = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000 // Keep the connection alive for 5 seconds
    }).then(() => {
      console.log('✅ MongoDB Connected!');
      return mongoose.connection;
    }).catch(err => {
        console.error('MongoDB Connection Error:', err);
        // Explicitly set conn to null on connection failure to allow retries
        conn = null; 
    });
    // `await` the promise to ensure the connection is established before proceeding
    await conn;
  } else {
    console.log('Re-using existing MongoDB connection.');
  }
  return conn;
};

// Middleware to ensure DB is connected before handling any request
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch(error) {
        console.error("Database connection middleware error:", error);
        res.status(503).json({ message: "Service Unavailable: Could not connect to the database." });
    }
});




// Root "Welcome" Route - great for health checks
app.get('/', (req, res) => {
    res.status(200).json({ message: "Welcome to the Social Media API. It is live and running." });
});

// GET /api/posts - Fetch all posts for the feed
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).json({ message: 'Error fetching posts', error: error.message });
    }
});

// POST /api/posts - Create a new post
app.post('/api/posts', upload.single('image'), async (req, res) => {
  try {
    // 1. Validate input
    let imageUrl = "";

if (req.file) {
  const b64 = Buffer.from(req.file.buffer).toString("base64");
  let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

  const result = await cloudinary.uploader.upload(dataURI, {
    folder: "social_media_posts",
  });

  imageUrl: imageUrl || ""

}
    const { username, caption, name, bio, interests, website, music, phone, password, email, gender, userProfileUrl } = req.body;
    if (!username || !caption) {
      return res.status(400).json({ message: 'Username and caption are required fields.' });
    }

    // 2. Upload image to Cloudinary
    // Convert buffer to a Data URI, which is a common way to handle uploads
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "social_media_posts",
    });

    // 3. Create and save the new post in the database
    const newPost = new Post({
  username,
  caption,
  imageUrl: imageUrl || "", // fallback if no image
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
    
    // 4. Send successful response
    res.status(201).json(savedPost);

  } catch (error) {
    console.error("Server error creating post:", error);
    res.status(500).json({ message: 'Error creating post', error: error.message });
  }
});







// PATCH /api/posts/:id - Update a specific post
app.patch('/api/posts/:id', async (req, res) => {
  try {
    // 1. Get the post ID from the URL and the update data from the body
    const { id } = req.params;
    const updates = req.body;

    // (Optional but good practice) Check for a valid ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Post ID format.' });
    }

    // 2. Find the post by ID and update it with the new data
    //    We use { new: true } to get the updated document back.
    //    We use { runValidators: true } to ensure our schema rules (like for email/phone) are applied.
    const updatedPost = await Post.findByIdAndUpdate(
      id, 
      updates, 
      { new: true, runValidators: true }
    );

    // 3. Check if a post was found and updated
    if (!updatedPost) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    // 4. Send the updated post as a success response
    res.status(200).json(updatedPost);

  } catch (error) {
    console.error("Error updating post:", error);
    // If a validation error occurs (e.g., invalid email), it will be caught here
    res.status(500).json({ message: 'Error updating post', error: error.message });
  }
});


// DELETE /api/posts/:id - Delete a specific post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    // 1. Get the post ID from the URL parameters
    const { id } = req.params;

    // Check if the ID is a valid MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Post ID format.' });
    }

    
    //    findByIdAndDelete() finds the document and removes it.
    const deletedPost = await Post.findByIdAndDelete(id);

    // 3. Check if a post was actually found and deleted
    if (!deletedPost) {
      // If deletedPost is null, it means no post with that ID was found
      return res.status(404).json({ message: 'Post not found.' });
    }

    // 4. Send a success response
    res.status(200).json({ 
        message: 'Post deleted successfully.',
        deletedPost: deletedPost // It's often helpful to return the deleted item
    });

  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: 'Error deleting post', error: error.message });
  }
});





module.exports = app;
