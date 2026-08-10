import { AppError } from "../../utils/AppError";
import { UsersRepository } from "./users.repository";

import { User, UserIdentity } from "./users.types";

export class UsersService {
  private usersRepository = new UsersRepository();

  async ensureExists(identity: UserIdentity): Promise<User> {
    const { id, email } = identity;

    if (!id) throw new AppError("Invalid user identity", 400);
    if (!email) throw new AppError("Invalid user identity", 400);

    let user = await this.usersRepository.findById(id);
    if (user) return user;

    const baseNickname =
      email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_")
        .slice(0, 21) || "player";

    const suffix = id.replaceAll("-", "").slice(0, 8);

    const nickname = await this.usersRepository.nicknameExists(baseNickname)
      ? `${baseNickname}-${suffix}`
      : baseNickname;

    try {
      user = await this.usersRepository.create({
        id,
        email,
        nickname,
      });
    } catch (error) {
      user = await this.usersRepository.findById(id);
      if (!user) throw error;
    }

    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async findManyByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];

    return this.usersRepository.findManyByIds(ids);
  }
}