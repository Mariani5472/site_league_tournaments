import { ProfileRepository } from "./profile.repository";

export class ProfileService {
  private profileRepository = new ProfileRepository();

  async getProfile(userId: string) {
    const profile = await this.profileRepository.findById(userId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    return profile;
  }

  async updateProfile(params: {
    userId: string;
    nickname: string;
    avatar_url: string | null;
    banner_url: string | null;
  }) {
    return this.profileRepository.update(params);
  }
}