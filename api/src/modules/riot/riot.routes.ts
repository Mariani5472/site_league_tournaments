import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { RiotController } from "./riot.controller";

const riotRoutes = Router();
const riotController = new RiotController();

riotRoutes.get("/me", authMiddleware, riotController.me.bind(riotController));
riotRoutes.delete("/me", authMiddleware, riotController.unlink.bind(riotController));
riotRoutes.post("/link", authMiddleware, riotController.linkAccount.bind(riotController));

export { riotRoutes };
