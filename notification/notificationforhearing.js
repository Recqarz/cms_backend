import { CnrDetail } from "../module/cases/case.model.js";
import { User } from "../module/users/user.model.js";
import { sendHearingNotificationOnEmail } from "./emailnotification.js";
import { sendHearingNotificationOnSms } from "./smsnotification.js";
import { sendWhatsappMessage } from "./whatsappnotification.js";

function parseCustomDate(dateStr) {
  const months = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  };
  const match = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)\s([a-zA-Z]+)\s(\d{4})/);
  if (!match) return null;
  const [_, day, month, year] = match;
  const normalizedMonth = month.toLowerCase();
  if (!(normalizedMonth in months)) return null;
  return new Date(year, months[normalizedMonth], parseInt(day));
}

export const dataToSendNotification11am = async () => {
  try {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    today.setHours(0, 0, 0, 0);
    const thresholdDate = new Date(today);
    thresholdDate.setDate(today.getDate() + 4);
    thresholdDate.setHours(23, 59, 59, 999);

    const cases = await CnrDetail.find({
      userId: { $exists: true, $ne: [] },
      "caseStatus.1.1": { $exists: true },
    });

    const filteredCases = cases.filter((caseData) => {
      const hearingDateStr = caseData.caseStatus?.[1]?.[1];
      const hearingDate = parseCustomDate(hearingDateStr);
      return (
        hearingDate && hearingDate >= today && hearingDate <= thresholdDate
      );
    });
    return filteredCases;
  } catch (error) {
    console.error("Error fetching cases for notification:", error);
    return [];
  }
};

export const dataToSendNotification06am = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thresholdDate = new Date(today);
    thresholdDate.setDate(today.getDate());
    thresholdDate.setHours(23, 59, 59, 999);

    const cases = await CnrDetail.find({
      userId: { $exists: true, $ne: [] },
      "caseStatus.1.1": { $exists: true },
    });

    const filteredCases = cases.filter((caseData) => {
      const hearingDateStr = caseData.caseStatus?.[1]?.[1];
      const hearingDate = parseCustomDate(hearingDateStr);
      return (
        hearingDate && hearingDate >= today && hearingDate <= thresholdDate
      );
    });
    console.log(filteredCases)
    return filteredCases;
  } catch (error) {
    console.error("Error fetching cases for notification:", error);
    return [];
  }
};

function dateDifference(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = parseCustomDate(dateStr);
  if (!targetDate) {
    throw new Error("Invalid date format: " + dateStr);
  }
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function numberToWord(num) {
  const words = ["one", "two", "three", "four"];
  return words[num - 1] || "unknown";
}

const verifyJointUserAndSendNotification = async (
  jointUser,
  datediff,
  caseTitled,
  previousHearingDate,
  cnrNumber,
  hearingDate
) => {
  try {
    if (Array.isArray(jointUser) && jointUser.length > 0) {
      for (let user of jointUser) {
        if (user?.email) {
          if (
            datediff <= user.dayBeforeNotification &&
            datediff - user.dayBeforeNotification !== 0
          ) {
            // send email notification at 11 am
            sendHearingNotificationOnEmail(
              caseTitled,
              previousHearingDate,
              cnrNumber,
              hearingDate,
              user.email
            );
          } else {
            // send email notification in morning 6 am
            sendHearingNotificationOnEmail(
              caseTitled,
              previousHearingDate,
              cnrNumber,
              hearingDate,
              user.email
            );
          }
        }
        if (user?.mobile) {
          if (
            datediff <= user.dayBeforeNotification &&
            datediff - user.dayBeforeNotification !== 0
          ) {
            // send mobile and WhatsApp notification at 11am
            sendHearingNotificationOnSms(cnrNumber, hearingDate, user.mobile);
            sendWhatsappMessage(
              caseTitled,
              previousHearingDate,
              cnrNumber,
              hearingDate,
              user.mobile
            );
          } else {
            // send mobile and WhatsApp notification in morning 6 am
            sendHearingNotificationOnSms(cnrNumber, hearingDate, user.mobile);
            sendWhatsappMessage(
              caseTitled,
              previousHearingDate,
              cnrNumber,
              hearingDate,
              user.mobile
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error verifying joint user:", error);
  }
};

const verifyUserAndSendNotification = async (
  user,
  datediff,
  caseTitled,
  previousHearingDate,
  cnrNumber,
  hearingDate
) => {
  try {
    if (Array.isArray(user) && user.length > 0) {
      for (let u of user) {
        const userDetails = await User.findById(u.userId);
        const jointUser = u.jointUser;
        const dayWord = numberToWord(datediff);
        const notificationKey = `${dayWord}DayBeforenotification`;

        if (userDetails) {
          if (datediff >= 1 && datediff <= 4) {
            if (userDetails.mobileSms && userDetails[notificationKey]) {
              // Send SMS notification to the user at 11am
              sendHearingNotificationOnSms(
                cnrNumber,
                hearingDate,
                userDetails.mobile
              );
            }
            if (userDetails.emailSms && userDetails[notificationKey]) {
              // Send email notification to the user at 11am
              sendHearingNotificationOnEmail(
                caseTitled,
                previousHearingDate,
                cnrNumber,
                hearingDate,
                userDetails.email
              );
            }
            if (userDetails.whatsAppSms && userDetails[notificationKey]) {
              // Send WhatsApp notification to the user at 11am
              sendWhatsappMessage(
                caseTitled,
                previousHearingDate,
                cnrNumber,
                hearingDate,
                userDetails.mobile
              );
            }
          } else {
            if (userDetails.mobileSms) {
              // Send SMS notification to the user at 6am
              sendHearingNotificationOnSms(
                cnrNumber,
                hearingDate,
                userDetails.mobile
              );
            }
            if (userDetails.emailSms) {
              // Send email notification to the user at 6am
              sendHearingNotificationOnEmail(
                caseTitled,
                previousHearingDate,
                cnrNumber,
                hearingDate,
                userDetails.email
              );
            }
            if (userDetails.whatsAppSms) {
              // Send WhatsApp notification to the user at 6am
              sendWhatsappMessage(
                caseTitled,
                previousHearingDate,
                cnrNumber,
                hearingDate,
                userDetails.mobile
              );
            }
          }
        }

        if (Array.isArray(jointUser) && jointUser.length > 0) {
          await verifyJointUserAndSendNotification(
            jointUser,
            datediff,
            caseTitled,
            previousHearingDate,
            cnrNumber,
            hearingDate
          );
        }
      }
    }
    return true;
  } catch (error) {
    console.error("Error verifying user:", error);
    return false;
  }
};

export const notificationSender11am = async () => {
  try {
    const data = await dataToSendNotification11am();
    if (data.length > 0) {
      for (let caseData of data) {
        const datediff = dateDifference(caseData?.caseStatus?.[1]?.[1]);
        const users = caseData?.userId;
        function cleanFirstLine(text) {
          const firstLine = text.split("\n")[0].trim();
          return firstLine.replace(/^\d+\)\s*/, "").trim();
        }
        const cleanedRespondent =
          cleanFirstLine(caseData?.respondentAndAdvocate[0][0]) || "";
        const cleanedPetitioner =
          cleanFirstLine(caseData?.petitionerAndAdvocate[0][0]) || "";
        let caseTitled = `${cleanedPetitioner} VS ${cleanedRespondent}`;
        let hearingDate = caseData?.caseStatus[1][1];
        let cnrNumber = caseData?.cnrNumber;
        let previousHearingDate =  caseData?.caseHistory.length>1 ?
          caseData?.caseHistory[caseData?.caseHistory.length - 1][1] : "NA";
        await verifyUserAndSendNotification(
          users,
          datediff,
          caseTitled,
          previousHearingDate,
          cnrNumber,
          hearingDate
        );
      }
    }
    console.log("Notification sent successfully at 11 AM");
  } catch (error) {
    console.error("Error sending notifications:", error);
    console.log("Error sending notifications at 11 AM");
  }
};

export const notificationSender06am = async () => {
  try {
    const data = await dataToSendNotification06am();
    if (data.length > 0) {
      for (let caseData of data) {
        const datediff = dateDifference(caseData?.caseStatus?.[1]?.[1]);
        const users = caseData?.userId;
        function cleanFirstLine(text) {
          const firstLine = text.split("\n")[0].trim();
          return firstLine.replace(/^\d+\)\s*/, "").trim();
        }
        const cleanedRespondent =
          cleanFirstLine(caseData?.respondentAndAdvocate[0][0]) || "";
        const cleanedPetitioner =
          cleanFirstLine(caseData?.petitionerAndAdvocate[0][0]) || "";
        let caseTitled = `${cleanedPetitioner} VS ${cleanedRespondent}`;
        let hearingDate = caseData?.caseStatus[1][1];
        let cnrNumber = caseData?.cnrNumber;
        let previousHearingDate =  caseData?.caseHistory.length>1 ?
          caseData?.caseHistory[caseData?.caseHistory.length - 1][1] : "NA";
        await verifyUserAndSendNotification(
          users,
          datediff,
          caseTitled,
          previousHearingDate,
          cnrNumber,
          hearingDate
        );
      }
    }
    console.log("Notification sent successfully at 06 AM");
  } catch (error) {
    console.error("Error sending notifications:", error);
    console.log("Error sending notifications at 06 AM");
  }
};
