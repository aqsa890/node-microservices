const axios = require('axios');

function extractToken(req) {
  const cookieToken = req.cookies && req.cookies.token;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  return null;
}

module.exports.userAuth = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const usersServiceUrl = process.env.USERS_SERVICE_URL || 'http://localhost:3301';

  axios
    .get(`${usersServiceUrl}/api/users/profile`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      timeout: 5000
    })
    .then((response) => {
      const user = response && response.data && response.data.user;
      const userId = user && (user.id || user._id);
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      req.user = { ...user, id: userId };
      return next();
    })
    .catch((error) => {
      if (error && error.response && error.response.status === 401) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (error && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT')) {
        return res.status(503).json({ message: 'User service unavailable' });
      }

      return res.status(401).json({ message: 'Unauthorized' });
    });
};

// Validate captain tokens by asking the Captain service for profile
module.exports.captainAuth = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const captainServiceUrl = process.env.CAPTAIN_SERVICE_URL || 'http://localhost:3302';

  axios
    .get(`${captainServiceUrl}/api/captains/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000
    })
    .then((response) => {
      const captain = response && response.data && response.data.captain;
      const captainId = captain && (captain.id || captain._id);
      if (!captainId) return res.status(401).json({ message: 'Unauthorized' });

      req.captain = { ...captain, id: captainId };
      return next();
    })
    .catch((error) => {
      if (error && error.response && error.response.status === 401) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (error && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT')) {
        return res.status(503).json({ message: 'Captain service unavailable' });
      }

      return res.status(401).json({ message: 'Unauthorized' });
    });
};
