import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";
export function sendHearingNotificationOnEmail(
  caseTitled,
  previousHearingDate,
  cnrNumber,
  hearingDate,
  email
) {
  const outlookEmail = process.env.OUTLOOK_EMAIL;
  const outlookPassword = process.env.OUTLOOK_PASSWORD;
  const fromEmail = process.env.FROMEMAIL;
  const subject = `Next Hearing for case Titled ${caseTitled}`;
  const body = `
      The next hearing for the case titled ${caseTitled} is scheduled as follows:
      Hearing Date: ${hearingDate}
      CNR Number: ${cnrNumber}
      Previous Hearing Date: ${previousHearingDate}
      For any assistance or clarification, feel free to get in touch.
      Best regards,
      CMS_RECQARZ
    `;
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
    to: email,
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
