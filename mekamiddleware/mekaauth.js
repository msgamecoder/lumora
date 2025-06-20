// mekamiddleware/mekaauth.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '⛔ No token provided. Access denied.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.meka = decoded; // contains { id: user.id_two }
    next();
  } catch (err) {
    return res.status(403).json({ message: '🚫 Invalid or expired token.' });
  }
};

module.exports = verifyToken;