import { Request, Response } from "express";
import { ProfileService } from "./profile.service";
import { discoverPlayersQuerySchema, profileParamsSchema, updateProfileBodySchema } from "./profile.schemas";
export class ProfileController {
    private profileService = new ProfileService();
    async discover(request: Request, response: Response) {
        const query = discoverPlayersQuerySchema.parse(request.query);
        return response.json(await this.profileService.discover(request.user.id, query));
    }
    async show(request: Request, response: Response) {
        const profile = await this.profileService.showPrivate(request.user.id);
        return response.json(profile);
    }
    async showPublic(request: Request, response: Response) {
        const { userId } = profileParamsSchema.parse(request.params);
        return response.json(await this.profileService.showPublic(userId));
    }
    async update(request: Request, response: Response) {
        const userId = request.user.id;
        const body = updateProfileBodySchema.parse(request.body);
        const profile = await this.profileService.update(userId, {
            nickname: body.nickname,
            avatarUrl: body.avatarUrl,
            bannerUrl: body.bannerUrl,
        });
        return response.json(profile);
    }
}
