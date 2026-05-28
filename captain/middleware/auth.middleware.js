const jwt= require('jsonwebtoken');
const captainModel = require('../models/captain.models');
const TokenBlacklist = require('../models/tokenBlacklist.models');

module.exports.captainAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const blacklisted = await TokenBlacklist.findOne({ token }).select('_id');
        if (blacklisted) {
            return res.status(401).json({ message: 'Token has been revoked' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const captain = await captainModel.findById(decoded.id);
        if (!captain) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        req.captain = captain;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Unauthorized' });
    }
}