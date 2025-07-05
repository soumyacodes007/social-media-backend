// models/share.js
const mongoose = require("mongoose");

const shareSchema = new mongoose.Schema({
  // The post that was shared
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
  },
  // The user who shared the post
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sharedAt: {
    type: Date,
    default: Date.now,
  },
  // You could add more fields here later, e.g., platform: 'whatsapp', 'facebook' etc.
});

module.exports = mongoose.model("Share", shareSchema);
