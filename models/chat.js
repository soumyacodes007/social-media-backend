const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [String], // userPhone numbers
  messages: [
    {
      sender: String,      // sender phone
      text: String,        // message content
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
