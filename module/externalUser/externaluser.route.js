import { Router } from "express";
import { addExternaluser, getExternalUser } from "./externaluser.controller.js";

export const externalUserRoute = Router();

externalUserRoute.post("/add-external-user", addExternaluser);

externalUserRoute.get("/get-external-user", getExternalUser);
