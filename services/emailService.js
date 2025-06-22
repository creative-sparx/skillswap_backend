import nodemailer from 'nodemailer';

// Use SendGrid or SMTP
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'SendGrid',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendEmail = async ({ to, subject, html, text }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'SkillSwap <no-reply@skillswap.com>',
    to,
    subject,
    html,
    text
  };
  return transporter.sendMail(mailOptions);
};

// Usage example:
// await sendEmail({ to, subject, html, text });
