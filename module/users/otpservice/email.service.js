import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
import sendGridMail from "@sendgrid/mail";
sendGridMail.setApiKey(process.env.SENDGRID_API_KEY);
export const sendOtptoEmail = async (user, otp) => {
  // const html = `
  //     Your OTP for Sandhee Platform is ${otp}. It is valid for 5 minutes. Please do not share it with anyone. Team SANDHEE (RecQARZ)
  //   `;

  // const emailData = {
  //   sender: {
  //     name: process.env.BREVO_SENDER_NAME,
  //     email: process.env.BREVO_SENDER_EMAIL,
  //   },
  //   to: [{ email: user.email, name: user.name }],
  //   subject: "OTP of CMS Platform",
  //   htmlContent: html,
  // };

  try {
    // await axios.post("https://api.brevo.com/v3/smtp/email", emailData, {
    //   headers: {
    //     accept: "application/json",
    //     "api-key": process.env.BREVO_SENDER_API_KEY,
    //     "content-type": "application/json",
    //   },
    // });
    const msg = {
      to: user.email, // recipient email
      from: process.env.SENDGRID_SENDER_EMAIL, // verified sender email
      subject: "OTP of CMS_RECQARZ Platform",
      html: `Your OTP for CMS_RECQARZ Platform is ${otp}. It is valid for 5 minutes. Please do not share it with anyone. Team CMS_RECQARZ`,
    };
 
    // Send email using SendGrid
    const response = await sendGridMail.send(msg);
    // Log success response to verify the OTP was sent
    // console.log(`OTP sent to ${email}:`, response);
 
    // Optionally log the status code or response
    // console.log(`Email send status code: ${response[0].statusCode}`);
 
    return { success: true, message: "OTP sent successfully" };
  } catch (error) {
    console.error("Error sending OTP to email:", error.message);
  }
};
