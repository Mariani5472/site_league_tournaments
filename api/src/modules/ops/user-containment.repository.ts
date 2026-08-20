import type { QueryOptions } from "../../@types/shared/QueryOptions";
import { db } from "../../database/connection";

export type OperationalStatus = "active" | "suspended" | "banned";
export type SessionRevocationStatus = "not_required" | "pending" | "succeeded" | "failed";

export type UserOperationalState = {
    id: string;
    operationalStatus: OperationalStatus;
    restrictionReason: string | null;
    suspendedUntil: Date | null;
    restrictedAt: Date | null;
    restrictedBy: string | null;
    sessionRevocationStatus: SessionRevocationStatus;
    sessionRevocationAttemptedAt: Date | null;
};

const projection = `id, operational_status AS "operationalStatus",
    restriction_reason AS "restrictionReason", suspended_until AS "suspendedUntil",
    restricted_at AS "restrictedAt", restricted_by AS "restrictedBy",
    session_revocation_status AS "sessionRevocationStatus",
    session_revocation_attempted_at AS "sessionRevocationAttemptedAt"`;

export class UserContainmentRepository {
    async find(userId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const result = await executor.query<UserOperationalState>(
            `SELECT ${projection} FROM users WHERE id = $1`,
            [userId]
        );
        return result.rows[0] ?? null;
    }

    async suspend(
        userId: string,
        actorId: string,
        reason: string,
        suspendedUntil: Date,
        options: QueryOptions = {}
    ) {
        const { executor = db } = options;
        const result = await executor.query<UserOperationalState>(`
            UPDATE users SET operational_status = 'suspended', restriction_reason = $2,
                suspended_until = $3, restricted_at = current_timestamp, restricted_by = $4,
                session_revocation_status = 'pending', session_revocation_attempted_at = NULL
            WHERE id = $1 RETURNING ${projection}
        `, [userId, reason, suspendedUntil, actorId]);
        return result.rows[0] ?? null;
    }

    async activate(userId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const result = await executor.query<UserOperationalState>(`
            UPDATE users SET operational_status = 'active', restriction_reason = NULL,
                suspended_until = NULL, restricted_at = NULL, restricted_by = NULL,
                session_revocation_status = 'not_required', session_revocation_attempted_at = NULL
            WHERE id = $1 RETURNING ${projection}
        `, [userId]);
        return result.rows[0] ?? null;
    }

    async markRevocation(userId: string, status: "succeeded" | "failed") {
        const result = await db.query<UserOperationalState>(`
            UPDATE users SET session_revocation_status = $2,
                session_revocation_attempted_at = current_timestamp
            WHERE id = $1 AND operational_status IN ('suspended', 'banned')
            RETURNING ${projection}
        `, [userId, status]);
        return result.rows[0] ?? null;
    }
}
