import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";

import { LeaguesController } from "./leagues.controller";
import { lobbiesRoutes } from "../lobbies/lobbies.routes";
import { leagueMembersRoutes } from "../league-members/league-members.routes";
import { leagueJoinRequestsRoutes } from "../league-requests/league-join-requests.routes";

const leaguesRoutes = Router();
const leaguesController = new LeaguesController();

leaguesRoutes.get(
  "/",
  authMiddleware,
  leaguesController.list.bind(leaguesController)
);

leaguesRoutes.get(
  "/:league_id",
  authMiddleware,
  leaguesController.show.bind(leaguesController)
);

leaguesRoutes.post(
  "/",
  authMiddleware,
  leaguesController.create.bind(leaguesController)
);

leaguesRoutes.patch(
  "/:league_id",
  authMiddleware,
  leaguesController.update.bind(leaguesController)
);

leaguesRoutes.delete(
  "/:league_id",
  authMiddleware,
  leaguesController.remove.bind(leaguesController)
);

leaguesRoutes.use("/:league_id/lobbies", lobbiesRoutes);
leaguesRoutes.use("/:league_id/members", leagueMembersRoutes);
leaguesRoutes.use("/:league_id/requests", leagueJoinRequestsRoutes);

export { leaguesRoutes };