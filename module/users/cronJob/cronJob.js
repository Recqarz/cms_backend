import cron from "node-cron";
import { cleanUpTempStorage } from "../user.controller.js";
import { cleanUpTempResetStorage } from "../resetPasswprd/resetPassword.controller.js";

export function cleanUpTempResetStorageofall() {
  cron.schedule("* 0 * * *", () => {
    cleanUpTempStorage();
    cleanUpTempResetStorage();
  });
}
