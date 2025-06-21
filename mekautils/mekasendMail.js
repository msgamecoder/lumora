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
  const mailOptions = {
    from: `"Lumora ⚡" <${process.env.EMAIL_SENDER}>`,
    to,
    subject: 'Lumora Email Verification',
    html: `
      <div style="font-family: sans-serif; padding: 1rem;">
        <p>Hi <b>@${username}</b>,</p>
        <p>Welcome to Lumora (${world === 'one' ? 'World One 🌍' : 'World Two 🌎'})</p>
        <p>Click below to verify your account:</p>
        <p><a href="${url}" style="padding: 10px 16px; background: #00ffe0; color: #000; text-decoration: none; border-radius: 5px;">Verify Account</a></p>
        <p>If you didn’t register, ignore this email.</p>
        <p style="font-size: 0.8rem; color: #777;">🔗 Lumora | MΞKΛ Core v4</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendVerificationEmail;
