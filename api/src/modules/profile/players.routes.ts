import { Router } from "express";
import { ProfileController } from "./profile.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { createHttpRateLimitMiddleware } from "../../rate-limit/http-rate-limit";
import { positiveInteger } from "../../rate-limit/fixed-window";
const controller = new ProfileController();
export const playersRoutes = Router();
const discoveryRateLimit = createHttpRateLimitMiddleware({
    limit: positiveInteger(process.env.PLAYER_SEARCH_RATE_LIMIT, 20),
    windowMs: positiveInteger(process.env.PLAYER_SEARCH_RATE_LIMIT_WINDOW_MS, 60_000),
    key: request => request.user.id,
    surface: "player_search",
});
playersRoutes.get("/", authMiddleware, discoveryRateLimit, controller.discover.bind(controller));
playersRoutes.get("/:userId", controller.showPublic.bind(controller));
