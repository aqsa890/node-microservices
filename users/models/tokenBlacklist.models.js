const mongoose = require('mongoose');

const tokenBlacklistSchema = new mongoose.Schema(
    {
        token: { type: String, required: true, unique: true, index: true },
        expiresAt: { type: Date, required: true }
    },
    { timestamps: true }
);

// TTL index: MongoDB will automatically remove documents after `expiresAt`.
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TokenBlacklist = mongoose.model('TokenBlacklist', tokenBlacklistSchema);

module.exports = TokenBlacklist;
