import type { Request, Response } from "express";
import { opsSecurityPolicy } from "../../middlewares/ops-auth.middleware";
import { platformRoleParamsSchema } from "./ops.schemas";
import { PlatformRolesService } from "./platform-roles.service";

export class OpsController {
    private readonly roles = new PlatformRolesService();

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
        const assignment = await this.roles.grant(request.user.id, userId, "super_admin");
        return response.status(201).json(assignment);
    }

    async revokeSuperAdmin(request: Request, response: Response) {
        const { userId } = platformRoleParamsSchema.parse(request.params);
        await this.roles.revoke(request.user.id, userId, "super_admin");
        return response.status(204).send();
    }
}
