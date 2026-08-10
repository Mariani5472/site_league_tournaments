import { Request, Response } from "express";
import { AuthService } from "./auth.service";

export class AuthController {
  private authService = new AuthService();

  async syncAuthenticatedUser(request: Request, response: Response) {
    const { id, email } = request.user;

    const user = await this.authService.syncAuthenticatedUser({
      id, email: email
    });

    return response.status(201).json(user);
  }
}