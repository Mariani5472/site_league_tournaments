import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";

import { LeaguesController } from "./leagues.controller";
import { lobbiesRoutes } from "../lobbies/lobbies.routes";

const leaguesRoutes = Router();
const leaguesController = new LeaguesController();

leaguesRoutes.get(
  "/",
  authMiddleware,
  leaguesController.list.bind(leaguesController)
);

leaguesRoutes.post(
  "/",
  authMiddleware,
  leaguesController.create.bind(leaguesController)
);


leaguesRoutes.get(
  "/:id",
  authMiddleware,
  leaguesController.show.bind(leaguesController)
);

leaguesRoutes.patch(
  "/:id",
  authMiddleware,
  leaguesController.update.bind(leaguesController)
);

leaguesRoutes.get(
  "/:id/members",
  authMiddleware,
  leaguesController.members.bind(leaguesController)
);

leaguesRoutes.patch(
  "/:id/members/:memberId/role",
  authMiddleware,
  leaguesController.updateMemberRole.bind(leaguesController)
);

leaguesRoutes.delete(
  "/:id/members/:memberId",
  authMiddleware,
  leaguesController.kickMember.bind(leaguesController)
);

leaguesRoutes.get(
  "/:id/requests",
  authMiddleware,
  leaguesController.requests.bind(leaguesController)
);

leaguesRoutes.post(
  "/:id/request",
  authMiddleware,
  leaguesController.requestJoin.bind(leaguesController)
);

leaguesRoutes.post(
  "/:id/requests/:requestId/reject",
  authMiddleware,
  leaguesController.rejectRequest.bind(leaguesController)
);

leaguesRoutes.post(
  "/:id/requests/:requestId/approve",
  authMiddleware,
  leaguesController.approveRequest.bind(leaguesController)
);

leaguesRoutes.post(
  "/:id/join",
  authMiddleware,
  leaguesController.join.bind(leaguesController)
);



leaguesRoutes.delete(
  "/:id/leave",
  authMiddleware,
  leaguesController.leave.bind(leaguesController)
);



leaguesRoutes.delete(
  "/:id",
  authMiddleware,
  leaguesController.remove.bind(leaguesController)
);

leaguesRoutes.use("/:leagueId/lobbies", lobbiesRoutes);

export { leaguesRoutes };