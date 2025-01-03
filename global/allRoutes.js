import { Router } from "express";
import { userRoutes } from "../module/users/user.route.js";
import { externalUserRoute } from "../module/externalUser/externaluser.route.js";
import { cnrRoute } from "../module/cases/case.route.js";
import { documentRoute } from "../module/document/document.route.js";
import  {todoRoutes}  from "../module/Task/todo.route.js";
export const allRoutes = Router();

allRoutes.use("/auth", userRoutes);

allRoutes.use("/external-user", externalUserRoute);

allRoutes.use("/cnr", cnrRoute);

allRoutes.use("/document", documentRoute);

allRoutes.use("/task", todoRoutes);