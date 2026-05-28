const mongoose = require('mongoose');

const captainSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
}, { timestamps: true });

const Captain = mongoose.model('Captain', captainSchema);

module.exports = Captain;