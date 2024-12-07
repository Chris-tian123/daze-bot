const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    messages: { type: [messageSchema], required: true }
});

module.exports = mongoose.model('Conversation', conversationSchema);
