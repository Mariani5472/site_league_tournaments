import { Request, Response } from "express";
import { ProfileService } from "./profile.service";
import { profileParamsSchema, updateProfileBodySchema } from "./profile.schemas";
export class ProfileController {
    private profileService = new ProfileService();
    async show(request: Request, response: Response) {
        const { userId } = profileParamsSchema.parse(request.params);
        const requesterId = request.user.id;
        const profile = await this.profileService.show(userId ?? requesterId);
        return response.json(profile);
    }
    async update(request: Request, response: Response) {
        const userId = request.user.id;
        const body = updateProfileBodySchema.parse(request.body);
        const profile = await this.profileService.update(userId, {
            nickname: body.nickname,
            avatarUrl: body.avatarUrl ?? null,
            bannerUrl: body.bannerUrl ?? null,
        });
        return response.json(profile);
    }
}
