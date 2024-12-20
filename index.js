import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { allRoutes } from "./global/allRoutes.js";
import { connection } from "./config/db.connection.js";
import cron from "node-cron";
import { dataUpdater } from "./crons/cronjob.js";
import { CnrDetail } from "./module/cases/case.model.js";
import { UnsavedCnr } from "./module/cases/unSavedCnr/unSavedCnr.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api", (req, res) => {
  res.json({ message: "Server health is good" });
});

app.use("/api", allRoutes);

const port = process.env.PORT;

cron.schedule("*/10 * * * *", () => {
  dataUpdater();
  console.log("running a task every ten minute");
});
dataUpdater();

// async function updateDatabse() {
//   try {
//     const result = await CnrDetail.find(
//       { intrimOrders: { $eq: [] } },
//       { cnrNumber: 1, _id: 0 }
//     );
//     for (const item of result) {
//       await UnsavedCnr.findOneAndUpdate(
//         { cnrNumber: item.cnrNumber },
//         { status: "pending" }
//       );
//     }
//   } catch (error) {
//     console.error("Error updating data", error);
//   }
// }

// updateDatabse();

app.listen(port, async () => {
  console.log(`server is running on port ${port}`);
  await connection;
  console.log("db connected");
});
