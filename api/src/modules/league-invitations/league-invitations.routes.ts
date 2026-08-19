import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { LeagueInvitationsController } from "./league-invitations.controller";

const controller = new LeagueInvitationsController();
export const invitationsRoutes = Router();
export const leagueInvitationsRoutes = Router({ mergeParams: true });

invitationsRoutes.get("/", authMiddleware, controller.list.bind(controller));
invitationsRoutes.patch(
  "/:invitationId",
  authMiddleware,
  controller.respond.bind(controller),
);
leagueInvitationsRoutes.post(
  "/",
  authMiddleware,
  controller.create.bind(controller),
);
leagueInvitationsRoutes.delete(
  "/:invitationId",
  authMiddleware,
  controller.cancel.bind(controller),
);
