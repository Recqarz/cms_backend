const cron = require("node-cron");
const Case = require("../models/caseModel");
const User = require("../models/userModel");
const moment = require("moment");
const twilio = require("twilio");

// Twilio configuration
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

// Function to send WhatsApp reminders
async function sendWhatsAppReminders(timeType) {
  // console.log(`Running Cron Job for WhatsApp ${timeType} reminders...`);

  try {
    const cases = await Case.find().populate("userId", "email name number");
    const now = moment();

    for (const caseEntry of cases) {
      const { cnrNumber, caseDetails, userId } = caseEntry;

      // Ensure user and phone number are valid
      if (!userId || !userId.number) continue;

      const { name, number } = userId;

      // Parse the next hearing date
      const nextHearingDate = caseDetails.nextHearingDate
        ? moment(caseDetails.nextHearingDate, "DD MMMM YYYY")
        : null;

      if (!nextHearingDate) continue;

      let shouldSendMessage = false;
      let messageText = `Hello ${name},\n\nThis is a reminder regarding your case (CNR Number: ${cnrNumber}).`;

      if (timeType === "8PM") {
        const oneDayBefore8PM = nextHearingDate
          .clone()
          .subtract(1, "day")
          .hour(20)
          .minute(0);
        if (now.isSame(oneDayBefore8PM, "minute")) {
          shouldSendMessage = true;
          messageText += `\nYour next hearing date is scheduled for ${nextHearingDate.format(
            "DD MMMM YYYY"
          )}. This is a reminder sent a day before the hearing.`;
        }
      } else if (timeType === "10PM") {
        const onDay10PM = nextHearingDate.clone().hour(22).minute(0);
        if (now.isSame(onDay10PM, "minute")) {
          shouldSendMessage = true;
          messageText += `\nYour next hearing date is today (${nextHearingDate.format(
            "DD MMMM YYYY"
          )}). This is a reminder sent on the day of the hearing.`;
        }
      }

      if (shouldSendMessage) {
        messageText += `\n\nThank you!`;

        try {
          await client.messages.create({
            from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${number}`,
            body: messageText,
          });
          // console.log(`WhatsApp reminder sent to ${number}`);
        } catch (error) {
          console.error(
            `Error sending WhatsApp message to ${number}:`,
            error.message
          );
        }
      }
    }
  } catch (error) {
    console.error("Error in sendWhatsAppReminders:", error.message);
  }
}

// Schedule jobs
cron.schedule("0 20 * * *", async () => {
  await sendWhatsAppReminders("8PM");
});

cron.schedule("17 13 * * *", async () => {
  await sendWhatsAppReminders("10PM");
});

module.exports = { sendWhatsAppReminders };
