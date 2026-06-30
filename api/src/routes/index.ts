import { Router } from "express";
import { usersRoutes } from "../modules/users/users.routes";
import { authRoutes } from "../modules/auth/auth.routes";
import { leaguesRoutes } from "../modules/leagues/leagues.routes";
import { profileRoutes } from "../modules/profile/profile.routes";
import { riotRoutes } from "../modules/riot/riot.routes";
import { lobbiesRoutes } from "../modules/lobbies/lobbies.routes";

export const routes = Router();

routes.get("/", (_, response) => {
  return response.json({
    message: "API running"
  });
});

routes.use("/auth", authRoutes);
routes.use("/users", usersRoutes);
routes.use("/leagues", leaguesRoutes);
routes.use("/profile", profileRoutes);
routes.use("/riot", riotRoutes);
routes.use("/lobbies", lobbiesRoutes);