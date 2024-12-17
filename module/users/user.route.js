import {
  resetPassword,
  tempResetPassword,
} from "./resetPasswprd/resetPassword.controller.js";
import { tempRegister, register, tempLogin, login } from "./user.controller.js";
import { Router } from "express";
export const userRoutes = Router();

userRoutes.post("/temp-register", tempRegister);

userRoutes.post("/register", register);

userRoutes.post("/temp-login", tempLogin);

userRoutes.post("/login", login);

userRoutes.post("/temp-reset-password", tempResetPassword);

userRoutes.post("/reset-password", resetPassword);
