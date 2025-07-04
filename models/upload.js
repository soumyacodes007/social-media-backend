const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  imageUrl: { type: String, required: false },
  videoUrl: { type: String, required: false },
  audioUrl: { type: String, required: false },
  textContent: { type: String, required: false },
  caption: { type: String, required: false },
  music: { type: String, required: false },
  uploadedAt: { type: Date, default: Date.now },
  uploaderPhone: { type: String, required: true },
  profileImage: { type: String, required: false }, 
});

module.exports = mongoose.model('Upload', uploadSchema);
