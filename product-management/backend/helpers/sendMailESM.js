import nodemailer from 'nodemailer';

/**
 * Gửi email qua Gmail SMTP
 * @param {string} to - Email người nhận
 * @param {string} subject - Tiêu đề email
 * @param {string} html - Nội dung HTML
 */
export const sendMail = async (to, subject, html) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS  // Gmail App Password (không phải mật khẩu thường)
        }
    });

    const mailOptions = {
        from: `"MVN Shop Management" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        // console.log('Email sent:', info.response);
        return info;
    } catch (error) {
        // console.error('Send email error:', error);
        throw error;
    }
};
