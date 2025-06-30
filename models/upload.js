const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: false,
  },
  videoUrl: {
    type: String,
    required: false,
  },
  audioUrl: {
    type: String,
    required: false,
  },
  textContent: {
    type: String,
    required: false,
  },
  caption: {
    type: String,
    required: false,
  },
  music: {
    type: String,
    required: false,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Upload', uploadSchema);
