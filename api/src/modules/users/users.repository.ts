import { db } from "../../database/connection";

import { CreateUserDTO } from "./users.types";

export class UsersRepository {
  async create(data: CreateUserDTO) {
    const query = `
      INSERT INTO users (
        id,
        email,
        nickname
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [
      data.id,
      data.email,
      data.nickname
    ];

    const result = await db.query(
      query,
      values
    );

    return result.rows[0];
  }

  async findById(user_id: string) {
    const query = `
      SELECT *
      FROM users
      WHERE id = $1
    `;

    const result = await db.query(query, [user_id]);

    return result.rows[0];
  }
}