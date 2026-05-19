import { Router } from "express";
import { usersRoutes } from "../modules/users/users.routes";

export const routes = Router();

routes.get("/", (_, response) => {
  return response.json({
    message: "API running"
  });
});

routes.use("/users", usersRoutes);