import cron from "node-cron";
import { cleanUpTempStorage } from "../user.controller.js";

cron.schedule("* 0 * * *", () => {
  cleanUpTempStorage();
});
