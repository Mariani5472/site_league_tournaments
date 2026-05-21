import { UsersRepository } from "../users/users.repository";
import { SyncInput } from "./auth.types";

export class AuthService {
  private usersRepository = new UsersRepository();

  async sync({ id, email }: SyncInput) {
    let user = await this.usersRepository.findById(id);

    if (!user) {
      user = await this.usersRepository.create({
        id,
        email,
        nickname: email.split("@")[0]
      });
    }

    return user;
  }
}