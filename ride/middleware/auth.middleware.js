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
