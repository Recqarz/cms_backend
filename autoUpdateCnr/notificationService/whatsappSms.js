import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import FormData from "form-data";

const messageType = process.env.messageType;
const fromNumber = process.env.fromNumber;
const templateid = process.env.templateid_orderSheet;
const serviceType = process.env.serviceType;
const messageuuid = process.env.messageuuid;

export async function sendWhatsAppWithOrderSheet(
  caseTitled,
  cnr,
  lastHearing,
  pdfurl,
  user
) {
  try {
    const responseData = await axios.get(pdfurl, {
      responseType: "arraybuffer",
    });
    const buffer = Buffer.from(responseData.data, "binary");

    const formData = new FormData();
    formData.append("messageType", messageType);
    formData.append("fromNumber", fromNumber);
    formData.append("contactnumber", user.mobile);
    formData.append("templateid", templateid);
    formData.append("serviceType", serviceType);
    formData.append("messageuuid", `${Date.now()}${messageuuid}`);
    formData.append("buttonValues", "");
    formData.append("dynamicUrl", "");
    formData.append("dynamicUrl2", "");
    formData.append("message", `${caseTitled},${cnr},${lastHearing}`);
    formData.append("file", buffer, { filename: "ordersheet.pdf" });

    const url = `https://automate.nexgplatforms.com/api/v1/wa/save-message`;
    const response = await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
        authorization: `9359e6555f404668b8ef031462cbdc97`,
      },
    });

    console.log("WhatsApp message sent successfully", response.data);
  } catch (error) {
    console.error(`Failed to send WhatsApp message: ${error.message}`);
  }
}
