import { db } from "../../database/connection";

import { CreateUserDTO, User } from "./users.types";

export class UsersRepository {
  async nicknameExists(nickname: string) {
    const result = await db.query(
      "SELECT 1 FROM users WHERE nickname = $1",
      [nickname]
    );

    return Boolean(result.rowCount);
  }

  async create(data: CreateUserDTO) {
    const result = await db.query<User>(
      `INSERT INTO users (
        id,
        email,
        nickname
      )
      VALUES ($1, $2, $3)
      RETURNING *`,
      [data.id, data.email, data.nickname]
    );

    return result.rows[0];
  }

  async findById(user_id: string) {
    const result = await db.query<User>(
      `SELECT *
      FROM users
      WHERE id = $1`,
      [user_id]
    );

    return result.rows[0];
  }

  async findManyByIds(ids: string[]) {
    const result = await db.query<User>(
      `SELECT *
      FROM users
      WHERE id = ANY($1)`
      , [ids]
    );
    return result.rows;
  }
}
