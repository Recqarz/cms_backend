import { Router } from "express";

export const cnrRoute = Router();

cnrRoute.get("/get-cnr", getCnrDetails)