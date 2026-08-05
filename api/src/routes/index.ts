import { Router } from "express";
import { usersRoutes } from "../modules/users/users.routes";
import { authRoutes } from "../modules/auth/auth.routes";
import { leaguesRoutes } from "../modules/leagues/leagues.routes";
import { profileRoutes } from "../modules/profile/profile.routes";
import { matchesRoutes } from "../modules/matches/matches.routes";
import { riotRoutes } from "../modules/riot/riot.routes";

export const routes = Router();

routes.get("/", (_, response) => {
  return response.json({
    message: "API running"
  });
});

routes.use("/auth", authRoutes);
routes.use("/users", usersRoutes);
routes.use("/profile", profileRoutes);
routes.use("/riot", riotRoutes);
routes.use("/leagues", leaguesRoutes);
routes.use("/matches", matchesRoutes);
