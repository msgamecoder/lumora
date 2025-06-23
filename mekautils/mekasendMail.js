const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * type: "register" | "forgot" | "resetSuccess" | "login"
 * @param {string} to - recipient email
 * @param {string} payload - URL or username depending on type
 * @param {string} type - email type
 * @param {object} [options] - extra data like world or login time
 */
const sendLumoraMail = async (to, payload, type, options = {}) => {
  let subject = "";
  let html = "";

  switch (type) {
    case "register":
      subject = "Lumora Email Verification";
      html = `
        <div style="font-family: sans-serif; padding: 1rem;">
          <p>Hi <b>@${options.username}</b>,</p>
          <p>Welcome to Lumora (${options.world === 'one' ? 'World One 🌍' : 'World Two 🌎'})</p>
          <p>Click below to verify your account:</p>
          <p><a href="${payload}" style="padding: 10px 16px; background: #8e2de2; color: #fff; text-decoration: none; border-radius: 5px;">Verify Account</a></p>
          <p>If you didn’t register, ignore this email.</p>
          <p style="font-size: 0.8rem; color: #777;">🔗 Lumora | MΞKΛ Core v4</p>
        </div>
      `;
      break;

case "forgot":
  subject = "🔑 Your Lumora Reset Code";
  html = `
    <div style="font-family: sans-serif; padding: 1rem;">
      <p>Hi there,</p>
      <p>We received a request to reset your Lumora password.</p>
      <p>Your reset code is:</p>
      <h2 style="letter-spacing: 4px; color: #ff5252;">${payload}</h2>
      <p>This code will expire in 15 minutes. If you didn’t request this, you can ignore this email.</p>
      <p style="font-size: 0.8rem; color: #777;">🔐 Lumora | MΞKΛ Core Security</p>
    </div>
  `;
  break;

    case "resetSuccess":
      subject = "✅ Your Lumora Password Was Changed";
      html = `
        <div style="font-family: sans-serif; padding: 1rem;">
          <p>Hello,</p>
          <p>Your Lumora account password was successfully updated.</p>
          <p>If you didn’t perform this action, please contact support immediately.</p>
          <p style="font-size: 0.8rem; color: #777;">🔒 Lumora | MΞKΛ Core Security</p>
        </div>
      `;
      break;

    case "login":
      subject = "🔓 New Login to Lumora";
      html = `
        <div style="font-family: sans-serif; padding: 1rem;">
          <p>Hello <b>@${options.username}</b>,</p>
          <p>Your account was just accessed on Lumora:</p>
          <ul>
            <li><b>Time:</b> ${options.time}</li>
            <li><b>IP Address:</b> ${options.ip || "Unknown"}</li>
          </ul>
          <p>If this wasn't you, please reset your password immediately.</p>
          <p style="font-size: 0.8rem; color: #777;">🔓 Lumora | Account Activity</p>
        </div>
      `;
      break;

    default:
      throw new Error("Invalid email type");
  }

  const mailOptions = {
    from: `"Lumora ⚡" <${process.env.EMAIL_SENDER}>`,
    to,
    subject,
    html
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendLumoraMail;
