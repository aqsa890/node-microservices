const jwt= require('jsonwebtoken');
const userModel = require('../models/user.models');
const TokenBlacklist = require('../models/tokenBlacklist.models');

module.exports.userAuth = async (req, res, next) => {
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
        const user = await userModel.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Unauthorized' });
    }
}