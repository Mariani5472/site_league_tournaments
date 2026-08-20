import type { Request, Response } from "express";
import { opsSecurityPolicy } from "../../middlewares/ops-auth.middleware";
import {
    platformAuditQuerySchema,
    opsLeagueParamsSchema,
    opsLeaguesQuerySchema,
    opsUserParamsSchema,
    opsUsersQuerySchema,
    platformRoleMutationSchema,
    platformRoleParamsSchema,
} from "./ops.schemas";
import { PlatformAuditService } from "./platform-audit.service";
import { PlatformRolesService } from "./platform-roles.service";
import { OpsDirectoryService } from "./ops-directory.service";

export class OpsController {
    private readonly roles = new PlatformRolesService();
    private readonly audit = new PlatformAuditService();
    private readonly directory = new OpsDirectoryService();

    session(request: Request, response: Response) {
        return response.json({
            role: request.platformRole,
            sensitiveActions: {
                mfaRequired: opsSecurityPolicy.requireMfa,
                reauthenticationMaxAgeSeconds: opsSecurityPolicy.reauthenticationMaxAgeSeconds,
            },
        });
    }

    async grantSuperAdmin(request: Request, response: Response) {
        const { userId } = platformRoleParamsSchema.parse(request.params);
        const { reason } = platformRoleMutationSchema.parse(request.body);
        const assignment = await this.roles.grant({
            actorId: request.user.id,
            userId,
            role: "super_admin",
            reason,
            correlationId: request.requestId,
        });
        request.log.info({
            operation: "ops.platform_role.grant",
            targetType: "user",
            targetId: userId,
            correlationId: request.requestId,
        }, "sensitive platform operation completed");
        return response.status(201).json(assignment);
    }

    async revokeSuperAdmin(request: Request, response: Response) {
        const { userId } = platformRoleParamsSchema.parse(request.params);
        const { reason } = platformRoleMutationSchema.parse(request.body);
        await this.roles.revoke({
            actorId: request.user.id,
            userId,
            role: "super_admin",
            reason,
            correlationId: request.requestId,
        });
        request.log.info({
            operation: "ops.platform_role.revoke",
            targetType: "user",
            targetId: userId,
            correlationId: request.requestId,
        }, "sensitive platform operation completed");
        return response.status(204).send();
    }

    async listAudit(request: Request, response: Response) {
        const query = platformAuditQuerySchema.parse(request.query);
        return response.json(await this.audit.list(query));
    }

    async listUsers(request: Request, response: Response) {
        return response.json(await this.directory.listUsers(opsUsersQuerySchema.parse(request.query)));
    }

    async userDetail(request: Request, response: Response) {
        const { userId } = opsUserParamsSchema.parse(request.params);
        return response.json(await this.directory.userDetail(userId));
    }

    async listLeagues(request: Request, response: Response) {
        return response.json(
            await this.directory.listLeagues(opsLeaguesQuerySchema.parse(request.query))
        );
    }

    async leagueDetail(request: Request, response: Response) {
        const { leagueId } = opsLeagueParamsSchema.parse(request.params);
        return response.json(await this.directory.leagueDetail(leagueId));
    }
}
