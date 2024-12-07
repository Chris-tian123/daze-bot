const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  answers: { type: [String], required: true }
});

module.exports = mongoose.model("Form", formSchema);
