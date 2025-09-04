// routes/auth.js or wherever registration happens
import transporter from "./mailer.js";
import dotenv from 'dotenv'

dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://dojoapp-8.onrender.com'


const sendVerificationEmail = async (userEmail, token) => {
  const verificationLink = `${FRONTEND_URL}/auth/verify-email/${token}`;
  console.log(process.env.SENDER_EMAIL);
  await transporter.sendMail({
    from: process.env.SENDER_EMAIL, // Use verified sender or Brevo domain
    to: userEmail,
    subject: "Verify your Email",
    html: `
      <h3>Welcome!</h3>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verificationLink}">Verify Email</a>
    `,
  });
};

export default sendVerificationEmail