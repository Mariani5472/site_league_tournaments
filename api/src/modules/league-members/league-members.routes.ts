import { Router } from "express";
import { LeagueMembersController } from "./league-members.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const leagueMembersRoutes = Router({ mergeParams: true });
const leagueMembersController = new LeagueMembersController();

leagueMembersRoutes.get(
  "/",
  authMiddleware,
  leagueMembersController.list.bind(leagueMembersController)
)

leagueMembersRoutes.post(
  "/:user_id",
  authMiddleware,
  leagueMembersController.create.bind(leagueMembersController)
)

leagueMembersRoutes.patch(
  "/:member_id",
  authMiddleware,
  leagueMembersController.update.bind(leagueMembersController)
)

leagueMembersRoutes.delete(
  "/:member_id",
  authMiddleware,
  leagueMembersController.remove.bind(leagueMembersController)
)

export { leagueMembersRoutes };