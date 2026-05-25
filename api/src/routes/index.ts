import { Router } from "express";
import { usersRoutes } from "../modules/users/users.routes";
import { authRoutes } from "../modules/auth/auth.routes";

export const routes = Router();

routes.get("/", (_, response) => {
  return response.json({
    message: "API running"
  });
});

routes.use("/users", usersRoutes);
routes.use("/auth", authRoutes);