import dotenv from "dotenv";
dotenv.config();
import fetch from "node-fetch";

const messageType = process.env.messageType;
const fromNumber = process.env.fromNumber;
const templateid = process.env.templateid_notification;
const serviceType = process.env.serviceType;
const messageuuid = process.env.messageuuid;

export const sendWhatsappMessage = async (
  caseTitled,
  previousHearingDate,
  cnrNumber,
  hearingDate,
  mobile
) => {
  let variable = `${caseTitled},${hearingDate},${cnrNumber},${previousHearingDate}`;
  const formData = new FormData();
  formData.append("messageType", messageType);
  formData.append("fromNumber", fromNumber);
  formData.append("contactnumber", mobile);
  formData.append("templateid", templateid);
  formData.append("serviceType", serviceType);
  formData.append("messageuuid", `${Date.now()}${messageuuid}`);
  formData.append("buttonValues", "");
  formData.append("dynamicUrl", "");
  formData.append("dynamicUrl2", "");
  formData.append("message", variable);
  const url = `https://automate.nexgplatforms.com/api/v1/wa/save-message`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `9359e6555f404668b8ef031462cbdc97`,
      },
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const responseBody = await response.json();
    console.log("WhatsApp message sent successfully");
  } catch (error) {
    console.error(`Error sending WhatsApp message: ${error.message}`);
  }
};
