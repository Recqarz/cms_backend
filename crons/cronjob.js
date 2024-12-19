import fetch from "node-fetch";
import { UnsavedCnr } from "../module/cases/unSavedCnr/unSavedCnr.js";

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

export const dataUpdater = async () => {
  try {
    let pendingCases;
    let ncase = await UnsavedCnr.find({ status: "priority" }).limit(5);

    if (ncase.length > 0) {
      pendingCases = ncase;
    } else {
      pendingCases = await UnsavedCnr.find({ status: "pending" }).limit(5);
    }

    if (pendingCases.length === 0) {
      console.log("No pending cases found.");
      return;
    }

    pendingCases.forEach((caseItem) => {
      const cnr = caseItem.cnrNumber;
      if (dataQueue.isAlreadyProcessing(cnr)) {
        console.log("Skipping already processing CNR:", cnr);
        return;
      }

      dataQueue.addToQueue(async () => {
        dataQueue.addToCurrentlyProcessing(cnr);

        try {
          const caseExists = await CnrDetail.findOne({ cnrNumber: cnr });

          if (caseExists) {
            await LocalCnr.findOneAndUpdate(
              { cnr_number: cnr },
              { status: "alreadyprocessed" }
            );
            console.log("Case exists, skipping:", cnr);
            return;
          }

          const obj = { cnr_number: cnr };

          const response = await fetch(
            "http://127.0.0.1:5000////get_case_details_status",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(obj),
            }
          );

          const data = await response.json();

          if (data.error === "Invalid_cnr") {
            await LocalCnr.findOneAndUpdate(
              { cnr_number: cnr },
              { status: "invalidcnr" }
            );
            return;
          }
          if (data.error === "Diffrent_format") {
            await LocalCnr.findOneAndUpdate(
              { cnr_number: cnr },
              { status: "Diffrent_format" }
            );
            return;
          }

          const nseurl = data?.s3_links?.map((ele) => ({
            order_date: ele.order_date,
            s3_url: ele.s3_url[0],
          }));

          const objs = { NA: "NA" };

          if (data) {
            await CnrDetail.create({
              cnrNumber: data?.cnr_number,
              status: data?.status,
              acts: data.Acts || [],
              caseDetails: data["Case Details"] || {},
              caseHistory: data["Case History"] || [],
              caseStatus: data["Case Status"] || [],
              caseTransferDetails: data["Case Transfer Details"] || [],
              firDetails: data["FIR Details"] ? data["FIR Details"] : objs,
              petitionerAndAdvocate: data["Petitioner and Advocate"] || [],
              respondentAndAdvocate: data["Respondent and Advocate"] || [],
              intrimOrders: nseurl || [],
            });

            await LocalCnr.findOneAndUpdate(
              { cnr_number: data?.cnr_number },
              { status: "processed" }
            );
          }
        } catch (error) {
          console.error(`Error fetching data for CNR ${cnr}:`, error);
          await LocalCnr.findOneAndUpdate(
            { cnr_number: cnr },
            { status: "wrong" }
          );
        } finally {
          dataQueue.removeFromCurrentlyProcessing(cnr);
        }
      });
    });
  } catch (error) {
    console.error("Error in data updating cron job:", error);
  }
};
