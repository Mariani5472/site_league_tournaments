import { db } from "../../database/connection";
import type { QueryOptions } from "../../@types/shared/QueryOptions";
import type { PlatformRole, PlatformRoleAssignment } from "./platform-roles.types";

const assignmentProjection = `
    id,
    user_id AS "userId",
    role,
    created_at AS "createdAt",
    created_by AS "createdBy",
    revoked_at AS "revokedAt",
    revoked_by AS "revokedBy"
`;

export class PlatformRolesRepository {
    async findActive(
        userId: string,
        role: PlatformRole,
        options: QueryOptions = {}
    ): Promise<PlatformRoleAssignment | null> {
        const { executor = db } = options;
        const result = await executor.query<PlatformRoleAssignment>(`
            SELECT ${assignmentProjection} FROM platform_roles
            WHERE user_id = $1 AND role = $2 AND revoked_at IS NULL
        `, [userId, role]);
        return result.rows[0] ?? null;
    }

    async grant(
        userId: string,
        role: PlatformRole,
        actorId: string,
        options: QueryOptions = {}
    ): Promise<PlatformRoleAssignment> {
        const { executor = db } = options;
        const result = await executor.query<PlatformRoleAssignment>(`
            INSERT INTO platform_roles (user_id, role, created_by)
            VALUES ($1, $2, $3) RETURNING ${assignmentProjection}
        `, [userId, role, actorId]);
        return result.rows[0];
    }

    async countActive(role: PlatformRole, options: QueryOptions = {}) {
        const { executor = db } = options;
        const result = await executor.query<{ total: number }>(`
            SELECT COUNT(*)::int AS total FROM platform_roles
            WHERE role = $1 AND revoked_at IS NULL
        `, [role]);
        return Number(result.rows[0].total);
    }

    async revoke(id: string, actorId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const result = await executor.query<PlatformRoleAssignment>(`
            UPDATE platform_roles
            SET revoked_at = current_timestamp, revoked_by = $2
            WHERE id = $1 AND revoked_at IS NULL
            RETURNING ${assignmentProjection}
        `, [id, actorId]);
        return result.rows[0] ?? null;
    }
}
