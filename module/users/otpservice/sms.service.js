import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export async function sendSmsToRecipient(to, text) {
  const apiUrl = `https://api2.nexgplatforms.com/sms/1/text/query`;

  const params = new URLSearchParams({
    username: process.env.NEXG_SMS_API_USERNAME,
    password: process.env.NEXG_SMS_API_PASSWORD,
    from: process.env.NEXG_SMS_API_FROM,
    to: `+91${to}`,
    text,
    indiaDltContentTemplateId: process.env.NEXG_INDIAN_DLT_CONTENT_TEMPLATE_ID,
    indiaDltTelemarketerId: process.env.NEXG_TELEMARKETER_ID,
    indiaDltPrincipalEntityId:
      process.env.NEXG_SMS_API_INDIA_DLT_PRINCIPAL_ENTITY_ID,
  }).toString();

  try {
    await axios.get(`${apiUrl}?${params}`);
  } catch (error) {
    console.error("Error sending SMS:", error.message);
    // Errors are silently handled here
  }
}
