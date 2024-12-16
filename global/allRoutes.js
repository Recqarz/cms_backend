import { Router } from "express";
import { userRoutes } from "../module/users/user.route.js";
export const allRoutes = Router();

allRoutes.use("/auth", userRoutes);
