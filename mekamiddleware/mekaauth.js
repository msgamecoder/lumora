// mekamiddleware/mekaauth.js
const jwt = require('jsonwebtoken');
const pool = require('../mekaconfig/mekadb');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '⛔ No token provided. Access denied.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🧠 Set both for compatibility
    req.meka = decoded;
    req.user = decoded; // 👈 Add this line so older code still works

    const result = await pool.query(
      `SELECT flagged, suspended FROM mekacore WHERE id_two = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "👤 User not found." });
    }

    const user = result.rows[0];

    if (user.flagged) {
      return res.status(423).json({ message: "🔒 Account flagged. Access denied." });
    }

    if (user.suspended) {
      return res.status(423).json({ message: "⏸️ Account suspended. Access denied." });
    }

    next();
  } catch (err) {
    return res.status(403).json({ message: '🚫 Invalid or expired token.' });
  }
};

module.exports = verifyToken;
