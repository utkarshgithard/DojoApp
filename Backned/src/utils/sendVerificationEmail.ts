import transporter from './mailer.js';
import dotenv from 'dotenv';

dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://dojo-app-ep5l.vercel.app';

const sendVerificationEmail = async (userEmail: string, token: string): Promise<void> => {
  const verificationLink = `${FRONTEND_URL}/verify-email/${token}`;
  console.log(process.env.SENDER_EMAIL);

  await transporter.sendMail({
    from: process.env.SENDER_EMAIL as string,
    to: userEmail,
    subject: 'Verify your Email',
    html: `
      <h3>Welcome!</h3>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verificationLink}">Verify Email</a>
    `,
  });
};

export default sendVerificationEmail;
