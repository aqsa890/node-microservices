const userModel = require('../models/user.models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const TokenBlacklist = require('../models/tokenBlacklist.models');

function extractToken(req) {
    const cookieToken = req.cookies && req.cookies.token;
    if (cookieToken) return cookieToken;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice('Bearer '.length).trim();
    }

    return null;
}

module.exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = await userModel.findOne({ email });

        if(user){
            return res.status(400).json({ message: 'User already exists' });    
        }

        const hash= await bcrypt.hash(password, 10);
        const newUser = new userModel({ username, email, password: hash });
        await newUser.save();

        const token = jwt.sign({id:newUser._id}, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token', token);

        res.status(201).json({ message: 'User registered successfully', token });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token', token);
        return res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports.logout = async (req, res) => {
    try {
        const token = extractToken(req);
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            // If it's already invalid/expired, treat as logged out.
            res.clearCookie('token');
            return res.status(200).json({ message: 'Logged out' });
        }

        const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 60 * 60 * 1000);

        await TokenBlacklist.updateOne(
            { token },
            { $setOnInsert: { token, expiresAt } },
            { upsert: true }
        );

        res.clearCookie('token');
        return res.status(200).json({ message: 'Logged out' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports.profile = async (req, res) => {
    try {
        // Requires auth middleware to set req.user
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userJson = req.user.toObject ? req.user.toObject() : req.user;
        delete userJson.password;

        return res.status(200).json({ user: userJson });
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
};