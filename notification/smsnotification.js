import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export async function sendHearingNotificationOnSms(
  cnrNumber,
  hearingDate,
  mobile
) {
  const text = `The next hearing is scheduled on ${hearingDate} for CNR No. ${cnrNumber}. Best regards CMS_RECQARZ.`;
  const apiUrl = `https://api2.nexgplatforms.com/sms/1/text/query`;

  const params = new URLSearchParams({
    username: process.env.NEXG_SMS_API_USERNAME,
    password: process.env.NEXG_SMS_API_PASSWORD,
    from: process.env.NEXG_SMS_API_FROM,
    to: `+91${mobile}`,
    text,
    indiaDltContentTemplateId: process.env.NOTIFICATION_NEXG_INDIAN_DLT_CONTENT_TEMPLATE_ID,
    indiaDltTelemarketerId: process.env.NEXG_TELEMARKETER_ID,
    indiaDltPrincipalEntityId:
      process.env.NEXG_SMS_API_INDIA_DLT_PRINCIPAL_ENTITY_ID,
  }).toString();

  try {
    await axios.get(`${apiUrl}?${params}`);
    console.log("SMS sent successfully!");
  } catch (error) {
    console.error("Error sending SMS:", error.message);
  }
}
