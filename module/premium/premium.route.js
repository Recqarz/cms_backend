import { Router } from "express";
import { getAllLocations, createLocation, deleteLocation } from "./premium.controller.js";

export const premiumlocation = Router();

premiumlocation.get("/getall", getAllLocations);

premiumlocation.post("/createlocation", createLocation);

premiumlocation.delete("/deletelocation/:id", deleteLocation);

