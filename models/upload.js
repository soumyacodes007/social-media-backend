const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
 imageUrl: {
    type: String,
    required: false,
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

module.exports = mongoose.model('Upload', uploadSchema);
