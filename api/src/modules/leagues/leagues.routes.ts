import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";

import { LeaguesController } from "./leagues.controller";

const leaguesRoutes = Router();
const leaguesController = new LeaguesController();

leaguesRoutes.get(
  "/my",
  authMiddleware,
  leaguesController.my.bind(
    leaguesController
  )
);

leaguesRoutes.get(
  "/public",
  authMiddleware,
  leaguesController.public.bind(
    leaguesController
  )
);

leaguesRoutes.get(
  "/:id",
  authMiddleware,
  leaguesController.show.bind(
    leaguesController
  )
);

leaguesRoutes.get(
  "/:id/members",
  authMiddleware,
  leaguesController.members.bind(
    leaguesController
  )
);

leaguesRoutes.get(
  "/:id/requests",
  authMiddleware,
  leaguesController.requests.bind(
    leaguesController
  )
);

leaguesRoutes.post(
  "/",
  authMiddleware,
  leaguesController.create.bind(
    leaguesController
  )
);

leaguesRoutes.post(
  "/:id/join",
  authMiddleware,
  leaguesController.join.bind(
    leaguesController
  )
);

leaguesRoutes.post(
  "/:id/request",
  authMiddleware,
  leaguesController.requestJoin.bind(
    leaguesController
  )
);

leaguesRoutes.post(
  "/:id/requests/:requestId/approve",
  authMiddleware,
  leaguesController.approveRequest.bind(
    leaguesController
  )
);

leaguesRoutes.post(
  "/:id/requests/:requestId/reject",
  authMiddleware,
  leaguesController.rejectRequest.bind(
    leaguesController
  )
);

leaguesRoutes.patch(
  "/:id/members/:memberId/role",
  authMiddleware,
  leaguesController.updateMemberRole.bind(
    leaguesController
  )
);

leaguesRoutes.delete(
  "/:id/members/:memberId",
  authMiddleware,
  leaguesController.kickMember.bind(
    leaguesController
  )
);

leaguesRoutes.delete(
  "/:id/leave",
  authMiddleware,
  leaguesController.leave.bind(
    leaguesController
  )
);

leaguesRoutes.patch(
  "/:id",
  authMiddleware,
  leaguesController.update.bind(
    leaguesController
  )
);

leaguesRoutes.delete(
  "/:id",
  authMiddleware,
  leaguesController.delete.bind(
    leaguesController
  )
);

export { leaguesRoutes };