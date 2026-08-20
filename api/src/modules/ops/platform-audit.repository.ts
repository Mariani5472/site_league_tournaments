import type { QueryOptions } from "../../@types/shared/QueryOptions";
import { toCursorPage } from "../../@types/shared/CursorPage";
import { db } from "../../database/connection";
import type {
    AppendPlatformAuditLog,
    ListPlatformAuditLogs,
    PlatformAuditLog,
} from "./platform-audit.types";

const auditProjection = `
    id,
    actor_id AS "actorId",
    action,
    target_type AS "targetType",
    target_id AS "targetId",
    reason,
    metadata,
    correlation_id AS "correlationId",
    created_at AS "createdAt"
`;

export class PlatformAuditRepository {
    async append(entry: AppendPlatformAuditLog, options: QueryOptions = {}) {
        const { executor = db } = options;
        const result = await executor.query<PlatformAuditLog>(`
            INSERT INTO platform_audit_logs (
                actor_id, action, target_type, target_id, reason, metadata, correlation_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING ${auditProjection}
        `, [
            entry.actorId,
            entry.action,
            entry.targetType,
            entry.targetId,
            entry.reason,
            entry.metadata,
            entry.correlationId,
        ]);
        return result.rows[0];
    }

    async list(params: ListPlatformAuditLogs) {
        const values: unknown[] = [];
        const where: string[] = [];
        const addFilter = (column: string, value: unknown) => {
            if (value === undefined) return;
            values.push(value);
            where.push(`${column} = $${values.length}`);
        };

        addFilter("actor_id", params.actorId);
        addFilter("action", params.action);
        addFilter("target_type", params.targetType);
        addFilter("target_id", params.targetId);
        if (params.from) {
            values.push(params.from);
            where.push(`created_at >= $${values.length}`);
        }
        if (params.to) {
            values.push(params.to);
            where.push(`created_at <= $${values.length}`);
        }
        if (params.cursor) {
            values.push(params.cursor);
            where.push(`(created_at, id) < (
                SELECT created_at, id FROM platform_audit_logs WHERE id = $${values.length}
            )`);
        }
        values.push(params.limit + 1);

        const result = await db.query<PlatformAuditLog>(`
            SELECT ${auditProjection}
            FROM platform_audit_logs
            ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
            ORDER BY created_at DESC, id DESC
            LIMIT $${values.length}
        `, values);
        return toCursorPage(result.rows, params.limit);
    }
}
