import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePlatformRole, requireSensitiveOpsAuth } from "../../middlewares/ops-auth.middleware";
import { OpsController } from "./ops.controller";

export const opsRoutes = Router();
const controller = new OpsController();

opsRoutes.use(authMiddleware, requirePlatformRole("super_admin"));
opsRoutes.get("/session", controller.session.bind(controller));
opsRoutes.post(
    "/platform-roles/:userId/super-admin",
    requireSensitiveOpsAuth,
    controller.grantSuperAdmin.bind(controller)
);
opsRoutes.delete(
    "/platform-roles/:userId/super-admin",
    requireSensitiveOpsAuth,
    controller.revokeSuperAdmin.bind(controller)
);
