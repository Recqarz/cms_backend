import cron from "node-cron";
import {
  notificationSender06am,
  notificationSender11am,
} from "./notificationforhearing.js";

export function sendHearingNotification() {
  cron.schedule("0 11 * * *", () => {
    notificationSender11am();
  });
  cron.schedule("0 06 * * *", () => {
    notificationSender06am();
  });
}
