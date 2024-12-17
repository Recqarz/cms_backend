import { Router } from "express";
import { userRoutes } from "../module/users/user.route.js";
import { externalUserRoute } from "../module/externalUser/externaluser.route.js";
export const allRoutes = Router();

allRoutes.use("/auth", userRoutes);

allRoutes.use("/external-user", externalUserRoute);
