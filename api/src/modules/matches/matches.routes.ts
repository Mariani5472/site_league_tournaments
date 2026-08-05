import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { MatchesController } from "./matches.controller";

const controller = new MatchesController();
export const matchesRoutes = Router();
matchesRoutes.get("/:match_id", authMiddleware, controller.show.bind(controller));
matchesRoutes.post("/:match_id/votes", authMiddleware, controller.vote.bind(controller));
matchesRoutes.post("/:match_id/resolve", authMiddleware, controller.resolve.bind(controller));

export const leagueMatchesRoutes = Router({ mergeParams: true });
leagueMatchesRoutes.get("/", authMiddleware, controller.list.bind(controller));
leagueMatchesRoutes.get("/standings", authMiddleware, controller.standings.bind(controller));
