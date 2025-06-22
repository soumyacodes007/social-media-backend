const mongoose = require("mongoose");

const storySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // assuming your user model is named "User"
    required: true,
  },
  mediaUrl: {
    type: String, // image/video URL or plain text content
    required: true,
  },
  type: {
    type: String,
    enum: ["image", "video", "text"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // expires after 24 hours (60*60*24 seconds)
  },
});

module.exports = mongoose.model("Story", storySchema);
