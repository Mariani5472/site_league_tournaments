import { Request, Response } from "express";
import { ProfileService } from "./profile.service";
export class ProfileController {
    private profileService = new ProfileService();
    async show(request: Request, response: Response) {
        const userId = request.params.userId as string | undefined;
        const requesterId = request.user.id;
        const profile = await this.profileService.show(userId ?? requesterId);
        return response.json(profile);
    }
    async update(request: Request, response: Response) {
        const userId = request.user.id;
        const { nickname, avatarUrl, bannerUrl } = request.body;
        const profile = await this.profileService.update(userId, {
            nickname,
            avatarUrl,
            bannerUrl
        });
        return response.json(profile);
    }
}
