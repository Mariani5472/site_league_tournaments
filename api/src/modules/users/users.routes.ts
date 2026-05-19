import { Router } from "express";

import { UsersController } from "./users.controller";

const usersRoutes = Router();

const usersController = new UsersController();
usersRoutes.post("/", usersController.create.bind(usersController));

export { usersRoutes };