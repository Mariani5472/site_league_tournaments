import { AppError } from "../../utils/AppError";
import { ProfileRepository } from "./profile.repository";
import type { CursorParams } from "../../@types/shared/CursorPage";

export class ProfileService {
    constructor(private readonly profileRepository = new ProfileRepository()) {}
    async discover(requesterId: string, params: CursorParams & { search: string }) {
        return this.profileRepository.discover(requesterId, params);
    }
    async showPrivate(userId: string) {
        const [profile, publicData] = await Promise.all([
            this.profileRepository.findPrivateById(userId), this.showPublic(userId),
        ]);
        if (!profile) throw new AppError("Profile not found", 404);
        return { ...publicData, email: profile.email };
    }
    async showPublic(userId: string) {
        const profile = await this.profileRepository.findPublicById(userId);
        if (!profile) throw new AppError("Profile not found", 404);
        const [stats, publicLeagues, recentMatches] = await Promise.all([
            this.profileRepository.getPublicStats(userId),
            this.profileRepository.listPublicLeagues(userId),
            this.profileRepository.listPublicRecentMatches(userId),
        ]);
        return { ...profile, stats, publicLeagues, recentMatches };
    }
    async update(userId: string, params: { nickname: string; avatarUrl?: string | null; bannerUrl?: string | null }) {
        return this.profileRepository.update(userId, params);
    }
}
