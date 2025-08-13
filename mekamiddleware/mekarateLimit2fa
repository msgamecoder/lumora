// mekamiddleware/rateLimit2fa.js
const rateMap = new Map();

// limit: { attempts, firstAttempt }
const limitConfig = {
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5 // max requests in that window
};

// List of sensitive endpoints that should be rate limited
const sensitivePaths = [
  '/meka/send-2fa-code',
  '/meka/verify-2fa-code',
  '/meka/verify-pin',
  '/meka/login',
  '/meka/forgot',
  '/meka/reset'
];

function rateLimit2FA(req, res, next) {
  try {
    // Skip if not a sensitive path
    if (!sensitivePaths.includes(req.path)) {
      return next();
    }

    const userKey = req.session?.internalId || req.ip;
    const now = Date.now();

    if (!rateMap.has(userKey)) {
      rateMap.set(userKey, { attempts: 1, firstAttempt: now });
      return next();
    }

    const data = rateMap.get(userKey);

    // reset if window passed
    if (now - data.firstAttempt > limitConfig.windowMs) {
      rateMap.set(userKey, { attempts: 1, firstAttempt: now });
      return next();
    }

    // still in same window
    if (data.attempts >= limitConfig.max) {
      const timeLeft = Math.ceil(
        (limitConfig.windowMs - (now - data.firstAttempt)) / 1000
      );
      return res.status(429).json({
        ok: false,
        message: `Too many requests. Try again in ${timeLeft} seconds.`
      });
    }

    data.attempts += 1;
    rateMap.set(userKey, data);
    next();
  } catch (err) {
    console.error("Rate limit error:", err);
    res.status(500).json({ ok: false, message: "Rate limiter failed" });
  }
}

module.exports = rateLimit2FA;
