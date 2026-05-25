import { Router } from "express";
import { usersRoutes } from "../modules/users/users.routes";
import { authRoutes } from "../modules/auth/auth.routes";
import { leaguesRoutes } from "../modules/leagues/leagues.routes";

export const routes = Router();

routes.get("/", (_, response) => {
  return response.json({
    message: "API running"
  });
});

routes.use("/auth", authRoutes);
routes.use("/users", usersRoutes);
routes.use("/leagues", leaguesRoutes);