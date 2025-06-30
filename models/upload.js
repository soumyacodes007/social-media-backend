// models/upload.js
const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  imageUrl: String,
  videoUrl: String,
  audioUrl: String,
  textContent: String,
  caption: String,
  music: String,
});

module.exports = mongoose.model('Upload', uploadSchema);
