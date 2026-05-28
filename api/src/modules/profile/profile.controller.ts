import { Request, Response } from "express";
import { ProfileService } from "./profile.service";

export class ProfileController {
  private profileService = new ProfileService();

  async me(request: Request, response: Response) {
    const userId = request.user.id;

    const profile =
      await this.profileService.getProfile(userId);

    return response.json(profile);
  }

  async update(request: Request, response: Response) {
    const userId = request.user.id;

    const {
      nickname,
      avatar_url,
      banner_url
    } = request.body;

    const profile =
      await this.profileService.updateProfile({
        userId,
        nickname,
        avatar_url,
        banner_url
      });

    return response.json(profile);
  }
}