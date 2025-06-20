// index.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const AWS = require('aws-sdk');
require('dotenv').config();

const Post = require('./models/post');
const app = express();
const PORT = process.env.PORT || 3001;

//  AWS S3 Configuration 
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

//  MIDDLEWARE
app.use(express.json());

//  MULTER SETUP 
// We'll store the file in memory before uploading to S3
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//  DATABASE CONNECTION 
// (Note: useNewUrlParser and useUnifiedTopology are no longer needed, but leaving them doesn't hurt)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected!'))
  .catch((err) => console.error(' MongoDB connection error:', err));


// API ROUTES 

// GET /api/posts - Fetch all posts for the feed
app.get('/api/posts', async (req, res) => {
    // code for fetching all posts
    try {
        // Find all posts in the database and sort them by creation date (newest first)
        const posts = await Post.find().sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).json({ message: 'Error fetching posts', error: error });
    }
});

// POST /api/posts - Create a new post
// `upload.single('image')` is multer middleware to handle the file
app.post('/api/posts', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded.' });
    }

    //  S3 UPLOAD LOGIC 
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${Date.now()}_${req.file.originalname}`, // Creates a unique filename
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    // The s3.upload function handles the upload and gives us the location
    s3.upload(uploadParams, async (err, data) => {
      if (err) {
        console.error("AWS S3 upload error:", err);
        return res.status(500).json({ message: "Error uploading to AWS S3" });
      }

      // `data.Location` contains the public URL of the uploaded image
      const imageUrl = data.Location;

      // Get the rest of the data from the request body
      const { username, caption, userProfileUrl } = req.body;

      if (!username || !caption) {
        return res.status(400).json({ message: 'Username and caption are required.' });
      }

      const newPost = new Post({
        username,
        caption,
        imageUrl: imageUrl, // Use the URL from the S3 result!
        userProfileUrl: userProfileUrl || '',
      });

      const savedPost = await newPost.save();
      res.status(201).json(savedPost);
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: 'Error creating post', error: error });
  }
});


// START SERVER 
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});