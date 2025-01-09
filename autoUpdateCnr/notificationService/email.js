import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";
import axios from "axios";

export async function sendEmailWithOrderSheet(
  caseTitled,
  cnr,
  lastHearing,
  url,
  user
) {
  const outlookEmail = process.env.OUTLOOK_EMAIL;
  const outlookPassword = process.env.OUTLOOK_PASSWORD;
  const fromEmail = process.env.FROMEMAIL;
  const subject = `Order sheet for the case titled ${caseTitled}`;
  const body = `Order sheet has been generated for the case titled ${caseTitled}, CNR Number ${cnr}, hearing held on ${lastHearing}.
                Please find the attached document for your ready reference. 
                Best regards, 
                CMS_RECQARZ.`;
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const attachmentFilename = "OrderSheet.pdf";

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
      attachments: [
        {
          filename: attachmentFilename,
          content: response.data,
          contentType: "application/pdf",
        },
      ],
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.error(`Failed to send email: ${error}`);
      }
      console.log(`Email sent successfully: ${info.response}`);
    });
  } catch (error) {
    console.error(`Failed to fetch or attach the PDF: ${error}`);
  }
}
