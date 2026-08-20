import { db } from "../../database/connection";
import { AppError } from "../../utils/AppError";
import { UsersRepository } from "../users/users.repository";
import { PlatformRolesRepository } from "./platform-roles.repository";
import type { PlatformRole } from "./platform-roles.types";

export class PlatformRolesService {
    constructor(
        private readonly roles = new PlatformRolesRepository(),
        private readonly users = new UsersRepository()
    ) {}

    findActive(userId: string, role: PlatformRole) {
        return this.roles.findActive(userId, role);
    }

    async grant(actorId: string, userId: string, role: PlatformRole) {
        if (actorId === userId) {
            throw new AppError("Operators cannot change their own platform role", 409);
        }
        if (!(await this.users.findById(userId))) {
            throw new AppError("User not found", 404);
        }
        if (await this.roles.findActive(userId, role)) {
            throw new AppError("Platform role is already active", 409);
        }
        return this.roles.grant(userId, role, actorId);
    }

    async revoke(actorId: string, userId: string, role: PlatformRole) {
        if (actorId === userId) {
            throw new AppError("Operators cannot change their own platform role", 409);
        }
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            await client.query("SELECT pg_advisory_xact_lock(hashtext('platform_roles:last_super_admin'))");
            const options = { executor: client };
            const assignment = await this.roles.findActive(userId, role, options);
            if (!assignment) throw new AppError("Platform role not found", 404);
            if (role === "super_admin" && (await this.roles.countActive(role, options)) <= 1) {
                throw new AppError("Platform must retain at least one active super admin", 409);
            }
            const revoked = await this.roles.revoke(assignment.id, actorId, options);
            await client.query("COMMIT");
            return revoked;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
}
