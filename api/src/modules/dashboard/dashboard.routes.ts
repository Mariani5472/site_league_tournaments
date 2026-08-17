import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { DashboardController } from "./dashboard.controller";

const controller = new DashboardController();
export const dashboardRoutes = Router();
dashboardRoutes.get("/", authMiddleware, controller.show.bind(controller));
