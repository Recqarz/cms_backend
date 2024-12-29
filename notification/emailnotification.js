import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export const sendHearingNotificationOnEmail = async (
  caseTitled,
  previousHearingDate,
  cnrNumber,
  hearingDate,
  email
) => {
  const html = `
      The next hearing for the case titled ${caseTitled} is scheduled as follows:
      Hearing Date: ${hearingDate}
      CNR Number: ${cnrNumber}
      Previous Hearing Date: ${previousHearingDate}
      For any assistance or clarification, feel free to get in touch.
      Best regards,
      CMS_RECQARZ
    `;

  const emailData = {
    sender: {
      name: process.env.BREVO_SENDER_NAME,
      email: process.env.BREVO_SENDER_EMAIL,
    },
    to: [{ email: email, name: "User" }],
    subject: `Next Hearing for case Titled ${caseTitled}`,
    htmlContent: html,
  };

  try {
    await axios.post("https://api.brevo.com/v3/smtp/email", emailData, {
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_SENDER_API_KEY,
        "content-type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error sending OTP to email:", error.message);
  }
};
