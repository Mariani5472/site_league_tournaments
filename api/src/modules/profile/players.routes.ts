import { Router } from "express";
import { ProfileController } from "./profile.controller";
const controller = new ProfileController();
export const playersRoutes = Router();
playersRoutes.get("/:userId", controller.showPublic.bind(controller));
