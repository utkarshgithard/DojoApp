// routes/auth.js or wherever registration happens
import transporter from "./mailer.js";
import dotenv from 'dotenv'

dotenv.config();

const sendVerificationEmail = async (userEmail, token) => {
  const verificationLink = `http://localhost:5173/verify-email/${token}`;
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