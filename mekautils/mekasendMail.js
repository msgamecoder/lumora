// mekautils/mekasendMail.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_PASS
  }
});

const sendVerificationEmail = async (to, url, username, world) => {
  const worldLabel = world === "one" ? "World One 🌍" : "World Two 🌎";

  const mailOptions = {
    from: `"Lumora ⚡" <${process.env.EMAIL_SENDER}>`,
    to,
    subject: 'Verify your Lumora account',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 1.5rem; background: #f9f9f9; border-radius: 10px; max-width: 600px; margin: auto;">
        <h2 style="color: #333;">👋 Hey <span style="color:#007bff;">@${username}</span>, welcome to Lumora!</h2>
        <p style="font-size: 1rem;">You chose <strong>${worldLabel}</strong>. Your journey starts here.</p>
        <p style="font-size: 1rem;">Tap the button below to activate your account:</p>
        <div style="margin: 1.5rem 0;">
          <a href="${url}" style="padding: 12px 24px; background: #007bff; color: white; text-decoration: none; font-weight: bold; border-radius: 6px;">Verify My Account</a>
        </div>
        <p style="font-size: 0.95rem;">⚠️ If you didn’t request this, you can safely ignore it.</p>
        <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #ddd;" />
        <footer style="font-size: 0.85rem; color: #666;">
          🔌 Powered by <strong>MΞKΛ Core v4</strong> — A little from the minds at <strong>Lumora</strong>.<br/>
          Need help? Email us at <a href="mailto:support@lumora.com">support@lumora.com</a>
        </footer>
        <p style="font-size: 0.75rem; color: #aaa;">This link will expire in 24 hours.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendVerificationEmail;