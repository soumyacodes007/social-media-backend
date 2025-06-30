const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
 imageUrl: {
    type: String,
    required: true,
  },
  videoUrl: {
    type: String,
    required: false, // New: for video posts
  },
  audioUrl: {
    type: String,
    required: false, // New: for voice posts
  },
  textContent: {
    type: String,
    required: false, // New: for text posts
  },
  caption: {
    type: String,
    required: false,
  },
  music: {
    type: String,
    required: false,
  },

});

module.exports = mongoose.model('Post2', postSchema);
