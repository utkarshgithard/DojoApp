// utils/mailer.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv'

dotenv.config()

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: process.env.BREVO_USER, // your Brevo login email
    pass: process.env.BREVO_SMTP_KEY, // your Brevo SMTP key (NOT account password)
  },
});

export default transporter
