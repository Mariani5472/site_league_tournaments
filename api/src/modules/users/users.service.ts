import { UsersRepository } from "./users.repository";

import { CreateUserDTO } from "./users.types";

export class UsersService {
  private usersRepository =
    new UsersRepository();

  async create(data: CreateUserDTO) {
    const userAlreadyExists =
      await this.usersRepository.findById(
        data.id
      );

    if (userAlreadyExists) {
      return userAlreadyExists;
    }

    return this.usersRepository.create(data);
  }
}