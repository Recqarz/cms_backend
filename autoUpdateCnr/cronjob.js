import cron from "node-cron";
import { cnrAutoUpdateInstanceOne } from "./cnrUpdateService/instanceOneCnrUpdate.js";
import { cnrAutoUpdateInstanceTwo } from "./cnrUpdateService/instanceTwoCnrUpdate.js";

export function autoUpdateCnrAndSendOrderSheet() {
  cron.schedule("0 19 * * *", () => {
    cnrAutoUpdateInstanceOne();
  });
  cron.schedule("10 19 * * *", () => {
    cnrAutoUpdateInstanceTwo();
  });
}
