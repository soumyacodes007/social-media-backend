// models/Post.js
const mongoose = require('mongoose');

// for now we are storing username and userProfileUrl on the post
const postSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  userProfileUrl: {
    type: String,
    required: false, // Maybe some users don't have a profile pic
  },
  imageUrl: {
    type: String,
    required: true,
  },
  caption: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set the creation date
  },
});

module.exports = mongoose.model('Post', postSchema);