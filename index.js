import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { allRoutes } from "./global/allRoutes.js";
import { connection } from "./config/db.connection.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api", (req, res) => {
  res.json({ message: "Server health is good" });
});

app.use("/api", allRoutes);

const port = process.env.PORT;

app.listen(port, async () => {
  console.log(`server is running on port ${port}`);
  await connection;
  console.log("db connected");
});
