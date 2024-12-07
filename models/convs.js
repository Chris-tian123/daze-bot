const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'bot'], required: true },
  content: { type: String, required: true }
});

const conversationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  messages: { type: [messageSchema], required: true }
});

module.exports = mongoose.model("Conversation", conversationSchema);
