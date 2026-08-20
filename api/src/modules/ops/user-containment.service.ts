import { db } from "../../database/connection";
import { logger } from "../../observability/logger";
import { SocketAccess } from "../../websocket/socket-access";
import { AppError } from "../../utils/AppError";
import { PlatformAuditRepository } from "./platform-audit.repository";
import {
    SupabaseSessionRevocationGateway,
    type SessionRevocationGateway,
} from "./supabase-session-revocation";
import { UserContainmentRepository } from "./user-containment.repository";

type Command = { actorId: string; userId: string; reason: string; correlationId: string };

export class UserContainmentService {
    constructor(
        private readonly users = new UserContainmentRepository(),
        private readonly audit = new PlatformAuditRepository(),
        private readonly sessions: SessionRevocationGateway = new SupabaseSessionRevocationGateway()
    ) {}

    async suspend(command: Command & { suspendedUntil: Date }) {
        if (command.actorId === command.userId) {
            throw new AppError("Operators cannot suspend their own account", 409);
        }
        if (command.suspendedUntil <= new Date()) {
            throw new AppError("Suspension must end in the future", 400);
        }
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            const options = { executor: client };
            const state = await this.users.suspend(
                command.userId,
                command.actorId,
                command.reason,
                command.suspendedUntil,
                options
            );
            if (!state) throw new AppError("User not found", 404);
            await this.audit.append({
                actorId: command.actorId,
                action: "user.suspended",
                targetType: "user",
                targetId: command.userId,
                reason: command.reason,
                metadata: {
                    status: "suspended",
                    suspendedUntil: command.suspendedUntil.toISOString(),
                    sessionRevocationStatus: "pending",
                },
                correlationId: command.correlationId,
            }, options);
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }

        await SocketAccess.disconnectUser(command.userId);
        try {
            await this.sessions.revokeUserSessions(command.userId);
            return await this.users.markRevocation(command.userId, "succeeded");
        } catch (error) {
            logger.error({
                operation: "ops.user.session_revocation",
                targetType: "user",
                targetId: command.userId,
                correlationId: command.correlationId,
                errorType: error instanceof Error ? error.name : "UnknownError",
            }, "external session revocation failed");
            return await this.users.markRevocation(command.userId, "failed");
        }
    }

    async unsuspend(command: Command) {
        if (command.actorId === command.userId) {
            throw new AppError("Operators cannot unsuspend their own account", 409);
        }
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            const options = { executor: client };
            const existing = await this.users.find(command.userId, options);
            if (!existing) throw new AppError("User not found", 404);
            if (existing.operationalStatus !== "suspended") {
                throw new AppError("User is not suspended", 409);
            }
            const state = await this.users.activate(command.userId, options);
            await this.audit.append({
                actorId: command.actorId,
                action: "user.unsuspended",
                targetType: "user",
                targetId: command.userId,
                reason: command.reason,
                metadata: { status: "active" },
                correlationId: command.correlationId,
            }, options);
            await client.query("COMMIT");
            return state;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
}
