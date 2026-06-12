const nodemailer = require('nodemailer');

/**
 * Send an email notification
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body
 */
const sendEmail = async (to, subject, text, html) => {
    try {
        // Create a transporter
        const transporter = nodemailer.createTransporter({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Email options
        const mailOptions = {
            from: `"WORKFORCE PRO" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email sent: %s', info.messageId);
        return info;
    } catch (err) {
        console.error('❌ Email failed:', err.message);
        // We don't throw error to avoid breaking the main request flow
        return null;
    }
};

module.exports = sendEmail;
