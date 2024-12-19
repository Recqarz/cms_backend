import { Router } from "express";
import { userRoutes } from "../module/users/user.route.js";
import { externalUserRoute } from "../module/externalUser/externaluser.route.js";
import { cnrRoute } from "../module/cases/case.route.js";
export const allRoutes = Router();

allRoutes.use("/auth", userRoutes);

allRoutes.use("/external-user", externalUserRoute);

allRoutes.use("/cnr", cnrRoute);
