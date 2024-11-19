import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.ENV_EMAIL_GOOGLE_NODEMAILER,
        pass: process.env.ENV_PASSWORD_GOOGLE_NODEMAILER
    }
});

export const sendEmail = async (mailOptions:any) => {
    return await transporter.sendMail(mailOptions);
};  