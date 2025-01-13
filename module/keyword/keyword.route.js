import { Router } from "express";
import { addKeyword, allKeyword, getNewKeywordCnrforCountry, getNewKeywordCnrforDistrict, getNewKeywordCnrforState } from "./keyword.controller.js";

export const keywordRoute = Router();

keywordRoute.get("/get-keyword", allKeyword)

keywordRoute.post("/add-keyword", addKeyword)

keywordRoute.get("/get-new-keyword-cnr-country", getNewKeywordCnrforCountry)

keywordRoute.get("/get-new-keyword-cnr-state", getNewKeywordCnrforState)

keywordRoute.get("/get-new-keyword-cnr-district", getNewKeywordCnrforDistrict)
