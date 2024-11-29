const sgMail = require('@sendgrid/mail');
const Case = require("../models/caseModel");
const SearchCase = require("../models/searchcase");
const moment = require("moment");
const cron = require("node-cron");

// Set up SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Ensure you set the SendGrid API key in your environment variables

// Utility function to clean up and format names (removes numbering and extra spaces)
function splitAndCleanNames(rawString) {
  if (!rawString || typeof rawString !== "string") return [];

  return rawString
    .split("\n") // Split by newlines
    .map((line) => line.trim()) // Trim whitespace
    .filter((line) => line) // Remove empty lines
    .map((line) => line.replace(/^\d+\)\s*/, "")); // Remove numbering like "1)"
}

function truncateNamesWithCount(names, maxNames = 2) {
  if (names.length <= maxNames) {
    return names.join(", ");
  }
  const visibleNames = names.slice(0, maxNames);
  const remainingCount = names.length - maxNames;
  return `${visibleNames.join(", ")} and others`;
}

async function sendReminderEmails({ checkForDaysBefore = [] }) {
  console.log(`Preparing to send reminder emails...`);

  try {
    // Fetch all cases with user data populated
    const cases = await Case.find().populate("userId", "email name");
    const now = moment();

    for (const caseEntry of cases) {
      const { cnrNumber, userId, ccEmails } = caseEntry; // Destructure ccEmails here

      // Ensure user and email are valid
      if (!userId || !userId.email) {
        console.warn(`Case ${cnrNumber} skipped: Missing user information or email.`);
        continue;
      }

      const { email, name } = userId;

      // Fetch corresponding SearchCase for caseDetails
      const searchCase = await SearchCase.findOne({ cnrNumber });
      if (!searchCase || !searchCase.caseDetails) {
        console.warn(`SearchCase ${cnrNumber} skipped: Missing caseDetails.`);
        continue;
      }

      // Extract Next Hearing Date from caseStatus
      let nextHearingDate = null;
      if (Array.isArray(searchCase.caseDetails.caseStatus)) {
        const nextHearingDateEntry = searchCase.caseDetails.caseStatus.find(
          (entry) => entry[0] === "Next Hearing Date"
        );
        if (nextHearingDateEntry && nextHearingDateEntry[1]) {
          nextHearingDate = moment(nextHearingDateEntry[1], "DD MMMM YYYY");
        }
      }

      if (!nextHearingDate || !nextHearingDate.isValid()) {
        console.warn(`SearchCase ${cnrNumber} skipped: Invalid or missing next hearing date.`);
        continue;
      }

      // Check if today matches any of the specified days before the hearing
      const daysBeforeHearing = checkForDaysBefore.map((day) =>
        nextHearingDate.clone().subtract(day, "days").format("YYYY-MM-DD")
      );
      console.log(
        `Checking Case ${cnrNumber} for days before hearing:`,
        daysBeforeHearing,
        "Today:",
        now.format("YYYY-MM-DD")
      );

      // Only send the email if today is in the days before the hearing or if today is the hearing day
      if (
        !daysBeforeHearing.includes(now.format("YYYY-MM-DD")) &&
        !now.isSame(nextHearingDate, "day")
      ) {
        console.log(`SearchCase ${cnrNumber} skipped: Not the correct day before the hearing.`);
        continue;
      }

      // Format the date with the day of the week
      const formattedDate = nextHearingDate.format("DD MMMM YYYY");
      const dayOfWeek = nextHearingDate.format("dddd");

      const petitionerAndAdvocateRaw = searchCase.caseDetails.petitionerAndAdvocate || "";
      const respondentAndAdvocateRaw = searchCase.caseDetails.respondentAndAdvocate || "";

      // Format names for email subject line (truncate both petitioner and respondent names)
      const petitionerNames = splitAndCleanNames(petitionerAndAdvocateRaw);
      const respondentNames = splitAndCleanNames(respondentAndAdvocateRaw);

      const truncatedPetitionerNames = truncateNamesWithCount(petitionerNames, 2);
      const truncatedRespondentNames = truncateNamesWithCount(respondentNames, 2);

      // Construct the subject line with truncated names
      const subject = `NDOH ${truncatedPetitionerNames} vs ${truncatedRespondentNames}`;

      // Log the subject to console
      console.log(`Subject for Case ${cnrNumber}:`, subject);

      // Construct the HTML email content
      const emailText = `
        <html>
          <head>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f4f7fc;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                background-color: #003366;
                color: #fff;
                padding: 20px;
                border-radius: 8px 8px 0 0;
              }
              .header h1 {
                font-size: 24px;
                margin: 0;
              }
              .content {
                padding: 20px;
              }
              .highlight {
                font-weight: bold;
                color: #003366;
              }
              .footer {
                font-size: 14px;
                color: #888;
                margin-top: 10px;
                padding: 20px;
              }
              .footer a {
                color: #003366;
                text-decoration: none;
              }
              .cta-button {
                background-color: #003366;
                color: #fff;
                padding: 10px 20px;
                border-radius: 5px;
                text-decoration: none;
                display: inline-block;
                margin-top: 20px;
              }
              .cta-button:hover {
                background-color: #00549d;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Reminder: Upcoming Court Hearing</h1>
              </div>
              <div class="content">
                <p>Hello <span class="highlight">${name},</p>
                <p>Your case titled <span class="highlight">"${petitionerAndAdvocateRaw} vs ${respondentAndAdvocateRaw}"</span> <span class="highlight">CNR no.(${cnrNumber})</span> is listed on ${formattedDate} (${dayOfWeek}).</p>
                <a href="mailto:support@recqarz.com" class="cta-button">Contact Support</a>
              </div>
              <div class="footer">
                <p>Best Regards, <br /> CMS Team <br /> recqarz</p>
                <p><a href="mailto:support@recqarz.com">support@recqarz.com</a> | <a href="https://www.recqarz.com">www.recqarz.com</a></p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Get dynamic CC emails if they exist
      const ccEmailsDynamic =
        Array.isArray(ccEmails) && ccEmails.length > 0
          ? ccEmails.map((cc) => cc.email)
          : []; // Or use an empty array if no CC emails

      const msg = {
        to: email,
        cc: ccEmailsDynamic.length > 0 ? ccEmailsDynamic : undefined, // Only include 'cc' if there are CC emails
        from: process.env.SENDGRID_FROM_EMAIL, // Make sure to set this in your environment variables
        subject: subject,
        html: emailText, // Use HTML content
      };

      console.log(`Dynamic CC emails for Case ${cnrNumber}:`, ccEmailsDynamic);

      // Send the email
      try {
        await sgMail.send(msg);
        console.log(`Reminder email sent to ${email}`);
      } catch (error) {
        console.error(`Error sending email to ${email}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in sendReminderEmails:", error);
  }
}


// Schedule the cron job to run at 6:00 AM on the day of the hearing
cron.schedule("00 6 * * *", async () => {
  const now = moment();
  await sendReminderEmails({ checkForDaysBefore: [0] });
});

// Schedule the cron job to run at 11:00 AM for 1, 2, or 4 days before the hearing
cron.schedule("00 11 * * *", async () => {
  const now = moment();
  await sendReminderEmails({ checkForDaysBefore: [1, 2, 4] });
});
