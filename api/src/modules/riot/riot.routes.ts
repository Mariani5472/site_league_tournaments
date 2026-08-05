import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { RiotController } from "./riot.controller";

const riotRoutes = Router();
const riotController = new RiotController();

riotRoutes.get("/config", riotController.configuration.bind(riotController));
riotRoutes.get("/", authMiddleware, riotController.show.bind(riotController));
riotRoutes.post("/", authMiddleware, riotController.create.bind(riotController));
riotRoutes.delete("/", authMiddleware, riotController.remove.bind(riotController));

export { riotRoutes };
