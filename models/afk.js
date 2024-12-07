const mongoose = require('mongoose')

const afkSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    afkMessage: { type: String, required: true },
});
 module.exports = mongoose.model("Afk", afkSchema);
