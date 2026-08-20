import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { PlatformRolesService } from "../modules/ops/platform-roles.service";
import type { PlatformRole } from "../modules/ops/platform-roles.types";

const roles = new PlatformRolesService();

function positiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number(value ?? fallback);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const opsSecurityPolicy = {
    requireMfa: process.env.OPS_REQUIRE_MFA !== "false",
    reauthenticationMaxAgeSeconds: positiveInteger(process.env.OPS_REAUTH_MAX_AGE_SECONDS, 900),
} as const;

export function requirePlatformRole(role: PlatformRole) {
    return async (request: Request, _response: Response, next: NextFunction) => {
        const assignment = await roles.findActive(request.user.id, role);
        if (!assignment) throw new AppError("Platform role required", 403);
        request.platformRole = assignment.role;
        return next();
    };
}

export function requireSensitiveOpsAuth(request: Request, _response: Response, next: NextFunction) {
    if (opsSecurityPolicy.requireMfa && request.user.authenticationAssuranceLevel !== "aal2") {
        throw new AppError("Multi-factor authentication is required", 403);
    }
    const authenticatedAt = request.user.authenticatedAt?.getTime();
    const maximumAgeMs = opsSecurityPolicy.reauthenticationMaxAgeSeconds * 1000;
    if (!authenticatedAt || Date.now() - authenticatedAt > maximumAgeMs) {
        throw new AppError("Recent authentication is required", 403);
    }
    return next();
}
