const captainModel = require('../models/captain.models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const TokenBlacklist = require('../models/tokenBlacklist.models');
const { subscribeToQueue } = require('../service/rabbit'); 
// pending long-poll responses from captains waiting for new ride assignments
const pendingWaiters = [];

// max wait time for long-poll (ms)
const LONG_POLL_TIMEOUT = 30000;
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
        const captain = await captainModel.findOne({ email });

        if(captain){
            return res.status(400).json({ message: 'Captain already exists' });    
        }

        const hash= await bcrypt.hash(password, 10);
        const newCaptain = new captainModel({ username, email, password: hash });
        await newCaptain.save();

        const token = jwt.sign({id:newCaptain._id}, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token', token);

        res.status(201).json({ message: 'Captain registered successfully', token });
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

        const captain = await captainModel.findOne({ email });
        if (!captain) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, captain.password);
        if (!match) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: captain._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
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
        // Requires auth middleware to set req.captain
        if (!req.captain) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const captainJson = req.captain.toObject ? req.captain.toObject() : req.captain;
        delete captainJson.password;

        return res.status(200).json({ captain: captainJson });
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports.toggleAvailability = async (req, res) => {
    try {
        if (!req.captain) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        req.captain.isAvailable = !req.captain.isAvailable;
        await req.captain.save();

        return res.status(200).json({ message: 'Availability updated', isAvailable: req.captain.isAvailable });
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
};

// When a new ride event arrives, notify any pending long-poll waiters.
subscribeToQueue('ride.created', data => {
    console.log('Received ride.created in controller:', data);
    try {
        // respond to all pending waiters for now (could be filtered by location/availability)
        while (pendingWaiters.length) {
            const waiter = pendingWaiters.shift();
            try { waiter.resolve(data); } catch (e) { console.error('Failed to resolve waiter', e && e.message ? e.message : e); }
        }
    } catch (err) {
        console.error('Error handling ride.created', err && err.message ? err.message : err);
    }
});

// Long-poll handler: waits until a new ride is available or timeout
module.exports.waitForRide = async (req, res) => {
    try {
        if (!req.captain) return res.status(401).json({ message: 'Unauthorized' });

        // set timeout to avoid hanging forever
        let settled = false;
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            // return no content when timeout
            res.status(204).end();
        }, LONG_POLL_TIMEOUT);

        // push a waiter that will be resolved when a ride arrives
        pendingWaiters.push({ captainId: req.captain._id.toString(), res, timer, resolve: (payload) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try { res.status(200).json({ ride: payload }); } catch (e) { /* ignore */ }
        }});
    } catch (err) {
        return res.status(500).json({ message: 'Server error' });
    }
};