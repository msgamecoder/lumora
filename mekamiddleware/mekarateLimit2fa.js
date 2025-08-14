// mekamiddleware/mekarateLimit2fa.js
const rateMap = new Map();

const limitConfig = {
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,                   // max requests before limit message
  silentBlockAfter: 15       // total attempts before silent block
};

const sensitivePaths = [
  '/meka/send-2fa-code',
  '/meka/verify-pin',
  '/meka/login',
  '/meka/forgot',
  '/meka/reset',
  '/meka/recover',
  '/meka/check-phone',
  '/meka/check-email',
  '/meka/confirm-update'
];

function rateLimit2FA(req, res, next) {
  try {
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

    // Reset window
    if (now - data.firstAttempt > limitConfig.windowMs) {
      rateMap.set(userKey, { attempts: 1, firstAttempt: now });
      return next();
    }

    // Too many attempts
    if (data.attempts >= limitConfig.max) {

      // If they've gone way beyond → silent block (no message)
      if (data.attempts >= limitConfig.silentBlockAfter) {
        return res.status(429).end();
      }

      const timeLeftSec = Math.ceil(
        (limitConfig.windowMs - (now - data.firstAttempt)) / 1000
      );

      let displayTime;
      if (timeLeftSec >= 60) {
        const minutes = Math.ceil(timeLeftSec / 60);
        displayTime = `${minutes} minute${minutes > 1 ? 's' : ''}`;
      } else {
        displayTime = `${timeLeftSec} second${timeLeftSec > 1 ? 's' : ''}`;
      }

      // Randomize message style
      const messages = [
        `Try again in ${displayTime}.`,
        `Try again in the next ${displayTime}.`,
        `Limit reached. Wait ${displayTime} before retrying.`
      ];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      return res.status(429).json({
        ok: false,
        message: randomMessage
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
