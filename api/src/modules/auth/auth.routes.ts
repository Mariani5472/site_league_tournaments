import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";


const authRoutes = Router();

const authController = new AuthController();
authRoutes.post("/sync", authMiddleware, authController.sync.bind(authController));

export { authRoutes };