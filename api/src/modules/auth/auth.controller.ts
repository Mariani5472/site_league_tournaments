import { Request, Response } from "express";
import { AuthService } from "./auth.service";

export class AuthController {
  private authService = new AuthService();

  async sync(
    request: Request,
    response: Response
  ) {
    const user = await this.authService.sync({
      id: request.user.id,
      email: request.user.email!
    });

    return response.status(201).json(user);
  }
}