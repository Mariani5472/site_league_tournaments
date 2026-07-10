import { AppError } from "../../utils/AppError";
import { ProfileRepository } from "./profile.repository";

export class ProfileService {
  private profileRepository = new ProfileRepository();

  async show(user_id: string) {
    const profile = await this.profileRepository.findById(user_id);
    if (!profile) {
      throw new AppError("Profile not found", 409);
    }

    return profile;
  }

  async update(user_id: string, params: {
    nickname: string;
    avatar_url: string | null;
    banner_url: string | null;
  }) {
    return this.profileRepository.update(user_id, params);
  }
}