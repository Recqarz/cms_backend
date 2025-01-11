import dotenv from "dotenv";
dotenv.config();
import fetch from "node-fetch";
import { CnrDetail } from "../../module/cases/case.model.js";
import { User } from "../../module/users/user.model.js";
import { sendEmailWithOrderSheet } from "../notificationService/email.js";
import { sendWhatsAppWithOrderSheet } from "../notificationService/whatsappSms.js";

class DataQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.currentlyProcessing = new Set();
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      try {
        await task();
      } catch (error) {
        console.error("Error processing task:", error);
      }
    }
    this.isProcessing = false;
  }

  addToQueue(task) {
    this.queue.push(task);
    this.processQueue();
  }

  addToCurrentlyProcessing(cnr) {
    this.currentlyProcessing.add(cnr);
  }

  removeFromCurrentlyProcessing(cnr) {
    this.currentlyProcessing.delete(cnr);
  }

  isAlreadyProcessing(cnr) {
    return this.currentlyProcessing.has(cnr);
  }
}

const dataQueue = new DataQueue();

export const cnrAutoUpdateInstanceTwo = async () => {
  try {
    const formatDateWithSuffix = (date) => {
      const day = date.getDate();
      const suffix =
        day % 10 === 1 && day !== 11
          ? "st"
          : day % 10 === 2 && day !== 12
          ? "nd"
          : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
      const paddedDay = day < 10 ? `0${day}` : day;
      const month = date.toLocaleString("en-US", { month: "long" });
      const year = date.getFullYear();
      return `${paddedDay}${suffix} ${month} ${year}`;
    };

    const today = new Date();
    const dates = Array.from({ length: 5 }, (_, i) => {
      const date = new Date();
      date.setDate(today.getDate() - i);
      return formatDateWithSuffix(date);
    });
    const casesToUpdate = await CnrDetail.find({
      "caseStatus.1.1": { $in: dates },
    });
    // const limit = Math.floor(casesToUpdate.length / 2);
    // const cases = casesToUpdate.slice(limit, casesToUpdate.length);

    for (const caseItem of casesToUpdate) {
      const cnr = caseItem.cnrNumber;

      if (dataQueue.isAlreadyProcessing(cnr)) {
        console.log("Skipping already processing CNR:", cnr);
        continue;
      }

      dataQueue.addToQueue(async () => {
        dataQueue.addToCurrentlyProcessing(cnr);

        try {
          const requestBody = {
            cnr_number: cnr,
            "Next Hearing Date": caseItem?.caseStatus[1][1],
          };
          const response = await fetch(
            process.env.PYTHON_API_URL_UPDATEINSTANCETWO,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            }
          );

          const responseData = await response.json();

          if (responseData.error === "Invalid_cnr") {
            console.log("Error: Invalid CNR while updating:", cnr);
            return;
          }

          const nseurl =
            responseData?.s3_links?.map((ele) => ({
              order_date: ele.order_date,
              s3_url: ele.s3_url,
            })) || [];

          function cleanFirstLine(text) {
            const firstLine = text.split("\n")[0].trim();
            return firstLine.replace(/^\d+\)\s*/, "").trim();
          }

          const cleanedRespondent =
            cleanFirstLine(caseItem?.respondentAndAdvocate[0][0]) || "";
          const cleanedPetitioner =
            cleanFirstLine(caseItem?.petitionerAndAdvocate[0][0]) || "";
          const caseTitled = `${cleanedPetitioner} VS ${cleanedRespondent}`;

          const existingRecord = await CnrDetail.findOne({ cnrNumber: cnr });
          if (!existingRecord) {
            console.log("No record found for CNR:", cnr);
            return;
          }

          if (nseurl.length > 0 && existingRecord?.userId.length > 0) {
            await Promise.all(
              existingRecord.userId.map(async (userObj) => {
                const currUser = await User.findById(userObj.userId);
                if (currUser) {
                  await sendEmailWithOrderSheet(
                    caseTitled,
                    cnr,
                    caseItem.caseStatus[1][1],
                    nseurl[0].s3_url,
                    currUser
                  );
                  await sendWhatsAppWithOrderSheet(
                    caseTitled,
                    cnr,
                    caseItem.caseStatus[1][1],
                    nseurl[0].s3_url,
                    currUser
                  );
                }
                const jointUser = userObj?.jointUser;
                if (jointUser.length > 0) {
                  await Promise.all(
                    jointUser.map(async (ele) => {
                      if (ele.email) {
                        await sendEmailWithOrderSheet(
                          caseTitled,
                          cnr,
                          caseItem.caseStatus[1][1],
                          nseurl[0].s3_url,
                          { email: ele?.email }
                        );
                        console.log(ele?.email);
                      }
                      if (ele.mobile) {
                        await sendWhatsAppWithOrderSheet(
                          caseTitled,
                          cnr,
                          caseItem.caseStatus[1][1],
                          nseurl[0].s3_url,
                          { mobile: ele?.mobile }
                        );
                        console.log(ele?.mobile);
                      }
                    })
                  );
                }
              })
            );
          }

          const mergedIntrimOrders = [
            ...(existingRecord.intrimOrders || []),
            ...nseurl,
          ];

          const mergedcaseHistory = [
            ...(existingRecord.caseHistory || []),
            ...(responseData["Case History"] || []),
          ];

          await CnrDetail.updateOne(
            { cnrNumber: cnr },
            {
              $set: {
                status: responseData?.status,
                acts: responseData.Acts || [],
                caseDetails: responseData["Case Details"] || {},
                caseHistory: mergedcaseHistory,
                caseStatus: responseData["Case Status"] || [],
                caseTransferDetails:
                  responseData["Case Transfer Details"] || [],
                firDetails: responseData["FIR Details"] || [],
                petitionerAndAdvocate:
                  responseData["Petitioner and Advocate"] || [],
                respondentAndAdvocate:
                  responseData["Respondent and Advocate"] || [],
                lastUpdated: Date.now(),
                intrimOrders: mergedIntrimOrders,
              },
            }
          );

          console.log("Successfully updated CNR:", cnr);
        } catch (error) {
          console.error("Error updating data for CNR:", cnr, error);
        } finally {
          dataQueue.removeFromCurrentlyProcessing(cnr);
        }
      });
    }
  } catch (error) {
    console.error("Error in CNR Auto Update Instance One:", error);
  }
};
