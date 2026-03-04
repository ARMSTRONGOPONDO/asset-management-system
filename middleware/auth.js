const jwt = require('jsonwebtoken');

// Basic auth: verifies JWT and attaches decoded user (including role) to req.user
module.exports = function (req, res, next) {
  const authHeader = req.header('Authorization');
  const token = authHeader ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is not valid' });
  }
};

// Admin-only guard for protected routes
module.exports.requireAdmin = function (req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
