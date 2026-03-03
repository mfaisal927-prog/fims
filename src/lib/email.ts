import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendOTP(to: string, otp: string) {
    try {
        const info = await transporter.sendMail({
            from: `"${process.env.FROM_NAME || 'Payroll Manager'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
            to,
            subject: 'Your Admin Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #333; text-align: center;">Admin Registration</h2>
                    <p style="font-size: 16px; color: #555;">Use the verification code below to complete your registration:</p>
                    <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-radius: 4px; margin: 20px 0;">
                        <h1 style="margin: 0; color: #007bff; letter-spacing: 5px;">${otp}</h1>
                    </div>
                    <p style="font-size: 14px; color: #777;">This code will expire in 10 minutes.</p>
                </div>
            `,
        });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error };
    }
}
