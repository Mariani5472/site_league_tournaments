import { Router } from "express";
import { ProfileController } from "./profile.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
const profileRoutes = Router();
const profileController = new ProfileController();
profileRoutes.get("/", authMiddleware, profileController.show.bind(profileController));
profileRoutes.get("/:userId", authMiddleware, profileController.show.bind(profileController));
profileRoutes.patch("/", authMiddleware, profileController.update.bind(profileController));
export { profileRoutes };
