import { Router } from "express";
import { addKeyword, allKeyword } from "./keyword.controller.js";

export const keywordRoute = Router();

keywordRoute.get("/get-keyword", allKeyword)

keywordRoute.post("/add-keyword", addKeyword)

