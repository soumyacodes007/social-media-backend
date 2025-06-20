// server.js (Complete and Corrected for Mock Testing)

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
// We don't need AWS for the mock, but we'll leave it for when you switch back
const AWS = require('aws-sdk'); 
require('dotenv').config();

// IMPORT YOUR POST MODEL
const Post = require('./models/post');

// --- THIS IS THE MISSING PART ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- MIDDLEWARE ---
app.use(express.json());

// --- MULTER SETUP ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected!'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));


// --- API ROUTES (ENDPOINTS) ---

// GET /api/posts (Your existing code for this should be fine)
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posts', error: error });
  }
});

// POST /api/posts - ** THE MOCK TESTING VERSION **
app.post('/api/posts', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded.' });
    }

    // --- MOCK LOGIC ---
    // STEP 1: The real S3 upload logic is commented out.
    /*
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${Date.now()}_${req.file.originalname}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    s3.upload(uploadParams, async (err, data) => {
      if (err) {
        console.error("AWS S3 upload error:", err);
        return res.status(500).json({ message: "Error uploading to AWS S3" });
      }
    */
    
    // STEP 2: We create a fake imageUrl.
    const imageUrl = "https://fake-s3-bucket.s3.amazonaws.com/test-image.jpg";

    // The rest of the logic continues as normal.
    const { username, caption, userProfileUrl } = req.body;

    if (!username || !caption) {
      return res.status(400).json({ message: 'Username and caption are required.' });
    }

    const newPost = new Post({
      username,
      caption,
      imageUrl: imageUrl, // Using the fake URL
      userProfileUrl: userProfileUrl || '',
    });

    const savedPost = await newPost.save();
    res.status(201).json(savedPost);

    // STEP 3: The end of the S3 comment block.
    /*
    });
    */
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: 'Error creating post', error: error });
  }
});


// --- START THE SERVER ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});