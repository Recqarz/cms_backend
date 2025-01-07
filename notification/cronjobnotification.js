import cron from "node-cron";
import {
  notificationSender06am,
  notificationSender11am,
} from "./notificationforhearing.js";

export function sendHearingNotification() {
  cron.schedule("30 5 * * *", () => {
    notificationSender11am();
  });
  cron.schedule("30 0 * * *", () => {
    notificationSender06am();
  });
}
