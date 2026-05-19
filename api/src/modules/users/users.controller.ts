import { Request, Response } from "express";

import { UsersService } from "./users.service";

export class UsersController {
  private usersService = new UsersService();

  async create(
    request: Request,
    response: Response
  ) {
    const user = await this.usersService.create(
      request.body
    );

    return response.status(201).json(user);
  }
}