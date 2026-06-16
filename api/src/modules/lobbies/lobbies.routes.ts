import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { LobbiesController } from "./lobbies.controller";

const lobbiesRoutes = Router();
const lobbiesController = new LobbiesController();

lobbiesRoutes.get(
  ":id",
  authMiddleware,
  lobbiesController.show.bind(lobbiesController)
);

lobbiesRoutes.post(
  "/",
  authMiddleware,
  lobbiesController.create.bind(lobbiesController)
);

lobbiesRoutes.post(
  "/:lobbyId/join",
  authMiddleware,
  lobbiesController.join.bind(lobbiesController)
);

lobbiesRoutes.patch(
  "/:lobbyId/ready",
  authMiddleware,
  lobbiesController.ready.bind(lobbiesController)
);

lobbiesRoutes.patch(
  "/:lobbyId/team",
  authMiddleware,
  lobbiesController.changeTeam.bind(lobbiesController)
);

lobbiesRoutes.delete(
  "/:lobbyId/leave",
  authMiddleware,
  lobbiesController.leave.bind(lobbiesController)
);

export { lobbiesRoutes };