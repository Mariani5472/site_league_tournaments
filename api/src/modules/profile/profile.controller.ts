import { Request, Response } from "express";
import { ProfileService } from "./profile.service";

export class ProfileController {
  private profileService = new ProfileService();

  async show(request: Request, response: Response) {
    const user_id = request.params.user_id as string | undefined;
    const requester_id = request.user.id;
    const profile = await this.profileService.show(user_id ?? requester_id);

    return response.json(profile);
  }

  async update(request: Request, response: Response) {
    const user_id = request.user.id;
    const {
      nickname,
      avatar_url,
      banner_url
    } = request.body;

    const profile = await this.profileService.update(user_id, {
      nickname,
      avatar_url,
      banner_url
    });

    return response.json(profile);
  }
}