const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendAlert = async (to, score, riskLevel) => {
  await transporter.sendMail({
    from: `"SecurePipeline" <${process.env.EMAIL_USER}>`,
    to,
    subject: "🚨 Security Alert from SecurePipeline",
    html: `
      <h2>Security Risk Detected</h2>
      <p><strong>Risk Level:</strong> ${riskLevel}</p>
      <p><strong>Security Score:</strong> ${score}</p>
      <p>Please check your dashboard immediately.</p>
    `,
  });
};