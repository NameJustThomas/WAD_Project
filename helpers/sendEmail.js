/**
 * Format Helper
 * Purpose: Utility functions for data formatting
 * Features:
 * - Price formatting
 * - Date formatting
 * - Number formatting
 * - Currency formatting
 */

// helpers/sendEmail.js
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: '"Online Shop" <from@example.com>',
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
