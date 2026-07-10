import { Router } from "express";
import { ProfileController } from "./profile.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const profileRoutes = Router();
const profileController = new ProfileController();

profileRoutes.get(
  "/:user_id",
  authMiddleware,
  profileController.show.bind(profileController)
);

profileRoutes.patch(
  "/:user_id",
  authMiddleware,
  profileController.update.bind(profileController)
);

export { profileRoutes };
