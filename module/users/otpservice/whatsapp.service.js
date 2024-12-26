import dotenv from "dotenv"
dotenv.config();

const messageType = process.env.messageType
const fromNumber = process.env.fromNumber
const templateid = process.env.templateid
const serviceType = process.env.serviceType
const messageuuid = process.env.messageuuid

export const sendWhatsappMessage = async (whatsappnumber, otp) => {
  const formData = new FormData();
  formData.append("messageType", messageType);
  formData.append("fromNumber", fromNumber);
  formData.append("contactnumber", whatsappnumber);
  formData.append("templateid", templateid);
  formData.append("serviceType", serviceType);
  formData.append("messageuuid", messageuuid);
  formData.append("buttonValues", "");
  formData.append("dynamicUrl", "");
  formData.append("dynamicUrl2", "");
  formData.append("message", otp);
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
