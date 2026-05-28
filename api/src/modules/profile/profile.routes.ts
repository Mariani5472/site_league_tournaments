import { Router } from "express";
import { ProfileController } from "./profile.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const profileRoutes = Router();
const profileController = new ProfileController();

profileRoutes.get("/me", authMiddleware, profileController.me.bind(profileController));
profileRoutes.patch("/me", authMiddleware, profileController.update.bind(profileController));

export { profileRoutes };
