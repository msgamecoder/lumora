const admin = require('../mekaconfig/mekafirebase');

const sendPushNotification = async (req, res) => {
  const { fcmToken, title, body, data } = req.body;

  if (!fcmToken || !title || !body) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const message = {
    token: fcmToken,
    notification: {
      title,
      body,
    },
    data: {
      ...(data || {}),
      click_action: "FLUTTER_NOTIFICATION_CLICK"
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("✅ Push sent:", response);
    res.json({ success: true, response });
  } catch (err) {
    console.error('❌ FCM error:', err);
    res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
};

module.exports = { sendPushNotification };
