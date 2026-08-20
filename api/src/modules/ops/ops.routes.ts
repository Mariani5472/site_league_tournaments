import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePlatformRole, requireSensitiveOpsAuth } from "../../middlewares/ops-auth.middleware";
import { OpsController } from "./ops.controller";
import { createHttpRateLimitMiddleware } from "../../rate-limit/http-rate-limit";
import { positiveInteger } from "../../rate-limit/fixed-window";

export const opsRoutes = Router();
const controller = new OpsController();
const opsSearchRateLimit = createHttpRateLimitMiddleware({
    limit: positiveInteger(process.env.OPS_SEARCH_RATE_LIMIT, 30),
    windowMs: positiveInteger(process.env.OPS_SEARCH_RATE_LIMIT_WINDOW_MS, 60_000),
    key: request => request.user.id,
    surface: "ops_search",
});

opsRoutes.use(authMiddleware, requirePlatformRole("super_admin"));
opsRoutes.get("/session", controller.session.bind(controller));
opsRoutes.get("/audit", requireSensitiveOpsAuth, controller.listAudit.bind(controller));
opsRoutes.get("/users", opsSearchRateLimit, controller.listUsers.bind(controller));
opsRoutes.get("/users/:userId", controller.userDetail.bind(controller));
opsRoutes.get("/leagues", opsSearchRateLimit, controller.listLeagues.bind(controller));
opsRoutes.get("/leagues/:leagueId", controller.leagueDetail.bind(controller));
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
