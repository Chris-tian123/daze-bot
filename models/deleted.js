const mongoose = require('mongoose');

const deletedMessageSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    content: { type: String, required: true },
    authorTag: { type: String, required: true },
    timestamp: { type: Date, required: true },
    deletedBy: { type: String, required: true }
});

module.exports = mongoose.model('DeletedMessage', deletedMessageSchema);
