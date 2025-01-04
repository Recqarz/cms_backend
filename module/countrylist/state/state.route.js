import { Router } from "express";
import { addState, allState } from "./state.controller.js";

export const stateRoute = Router();

stateRoute.get("/get-state", allState)

stateRoute.post("/add-state", addState)

