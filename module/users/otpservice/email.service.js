import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";

export function sendOtptoEmail(user, otp) {
  const outlookEmail = process.env.OUTLOOK_EMAIL;
  const outlookPassword = process.env.OUTLOOK_PASSWORD;
  const fromEmail = process.env.FROMEMAIL
  const subject = "Your one time password for Secure Access";
  const body = `Your verification code is: ${otp}. CMS_RecQARZ`;
  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    auth: {
      user: outlookEmail,
      pass: outlookPassword,
    },
  });
  const mailOptions = {
    from: fromEmail,
    to: user.email,
    subject: subject,
    text: body,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.error(`Failed to send email: ${error}`);
    }
    console.log(`Email sent successfully: ${info.response}`);
  });
}

