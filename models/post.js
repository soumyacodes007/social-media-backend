const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  username: {
    type: String,
    required: false,
  },
  userProfileUrl: {
    type: String,
    required: false,
  },
  caption: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
    required: false,
  },
  interests: {
    type: String,
    required: false,
  },
  website: {
    type: String,
    required: false,
  },
  music: {
    type: String,
    required: false,
  },
  phone: {
    type: String,
    required: true,
    match: [/^\d{10}$/, "Phone number must be 10 digits"],
  },
  password: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: true,
    match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
  },
  gender: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Post', postSchema);
