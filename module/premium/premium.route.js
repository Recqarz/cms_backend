import { Router } from "express";
import { getAllLocations, createLocation } from "./premium.controller.js";

export const premiumlocation = Router();

premiumlocation.get("/getall", getAllLocations);

premiumlocation.post("/createlocation", createLocation);

// router.delete("/:id", deleteLocation);

