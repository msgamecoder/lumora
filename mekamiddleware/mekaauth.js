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

    // 🔧 normalize the id coming from any payload shape
    const normalizedId = decoded.id ?? decoded.userId ?? decoded.id_two ?? decoded.uid;
    if (!normalizedId) {
      return res.status(403).json({ message: '🚫 Invalid token payload (no user id).' });
    }

    // 🧠 keep decoded, but guarantee .id exists
    req.user = { ...decoded, id: normalizedId };
    req.meka = req.user; // backward compat

    // use normalizedId for DB lookups
    const result = await pool.query(
      `SELECT flagged, suspended FROM mekacore WHERE id_two = $1`,
      [normalizedId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "👤 User not found." });
    }

    const user = result.rows[0];

    if (user.flagged) {
      return res.status(423).json({ message: "🔒 Account flagged. Access denied." });
    }

    if (user.suspended) {
      if (req.originalUrl === "/api/auth/meka/reactivate-account") {
        return next();
      }
      return res.status(423).json({ message: "⏸️ Account suspended. Access denied." });
    }

    next();
  } catch (err) {
    return res.status(403).json({ message: '🚫 Invalid or expired token.' });
  }
};

module.exports = verifyToken;
