import { AppError } from "../../utils/AppError";
import { ProfileRepository } from "./profile.repository";
export class ProfileService {
    private profileRepository = new ProfileRepository();
    async show(userId: string) {
        const profile = await this.profileRepository.findById(userId);
        if (!profile) {
            throw new AppError("Profile not found", 404);
        }
        return profile;
    }
    async update(userId: string, params: {
        nickname: string;
        avatarUrl: string | null;
        bannerUrl: string | null;
    }) {
        return this.profileRepository.update(userId, params);
    }
}
