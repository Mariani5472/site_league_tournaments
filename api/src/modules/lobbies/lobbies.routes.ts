import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { LobbiesController } from "./lobbies.controller";

const lobbiesRoutes = Router({ mergeParams: true });
const lobbiesController = new LobbiesController();

lobbiesRoutes.get(
  "/",
  authMiddleware,
  lobbiesController.list.bind(lobbiesController)
);

lobbiesRoutes.get(
  "/:lobby_id",
  authMiddleware,
  lobbiesController.show.bind(lobbiesController)
);

lobbiesRoutes.post(
  "/",
  authMiddleware,
  lobbiesController.create.bind(lobbiesController)
);

lobbiesRoutes.post(
  "/:lobby_id/join",
  authMiddleware,
  lobbiesController.join.bind(lobbiesController)
);

lobbiesRoutes.patch(
  "/:lobby_id/ready",
  authMiddleware,
  lobbiesController.ready.bind(lobbiesController)
);

lobbiesRoutes.patch(
  "/:lobby_id/unready",
  authMiddleware,
  lobbiesController.unready.bind(lobbiesController)
);

lobbiesRoutes.patch(
  "/:lobby_id/team",
  authMiddleware,
  lobbiesController.changeTeam.bind(lobbiesController)
);

lobbiesRoutes.delete(
  "/:lobby_id",
  authMiddleware,
  lobbiesController.remove.bind(lobbiesController)
);

lobbiesRoutes.delete(
  "/:lobby_id/leave",
  authMiddleware,
  lobbiesController.leave.bind(lobbiesController)
);

export { lobbiesRoutes };