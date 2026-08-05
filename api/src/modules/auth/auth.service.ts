import { UsersRepository } from "../users/users.repository";
import { SyncInput } from "./auth.types";
import { AppError } from "../../utils/AppError";

export class AuthService {
  private usersRepository = new UsersRepository();

  async sync({ id, email }: SyncInput) {
    let user = await this.usersRepository.findById(id);

    if (!user) {
      const baseNickname = email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_")
        .slice(0, 21) || "player";
      const suffix = id.replaceAll("-", "").slice(0, 8);

      try {
        user = await this.usersRepository.create({
          id,
          email,
          nickname: await this.usersRepository.nicknameExists(baseNickname)
            ? `${baseNickname}-${suffix}`
            : baseNickname
        });
      } catch (error) {
        // Two simultaneous sync requests for the same Supabase user are idempotent.
        user = await this.usersRepository.findById(id);
        if (!user) throw error;
      }
    }

    if (!user) throw new AppError("Could not create local profile", 500);

    return user;
  }
}
