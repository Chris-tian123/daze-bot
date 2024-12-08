const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    messages: [
      {
        role: { type: String, enum: ['user', 'bot'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
