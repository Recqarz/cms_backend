import { Router } from "express";
import { addExternaluser, delteExternalUser, getExternalUser } from "./externaluser.controller.js";

export const externalUserRoute = Router();

externalUserRoute.post("/add-external-user", addExternaluser);

externalUserRoute.get("/get-external-user", getExternalUser);

externalUserRoute.delete("/delete-external-user/:id", delteExternalUser);
