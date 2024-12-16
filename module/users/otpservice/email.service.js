import axios from "axios";

export const sendOtptoEmail = async (user, otp) => {
  const html = `
      Your OTP for Sandhee Platform is ${otp}. It is valid for 5 minutes. Please do not share it with anyone. Team SANDHEE (RecQARZ)
    `;

  const emailData = {
    sender: {
      name: process.env.BREVO_SENDER_NAME,
      email: process.env.BREVO_SENDER_EMAIL,
    },
    to: [{ email: user.email, name: user.name }],
    subject: "OTP of CMS Platform",
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
