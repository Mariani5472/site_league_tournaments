import type { CursorParams } from "../../@types/shared/CursorPage";
import type { PlatformRole } from "./platform-roles.types";

export type PlatformAuditAction = "platform_role.granted" | "platform_role.revoked";
export type PlatformAuditTargetType = "user";
export type PlatformAuditMetadata = { role: PlatformRole };

export type PlatformAuditLog = {
    id: string;
    actorId: string;
    action: PlatformAuditAction;
    targetType: PlatformAuditTargetType;
    targetId: string;
    reason: string;
    metadata: PlatformAuditMetadata;
    correlationId: string;
    createdAt: Date;
};

export type AppendPlatformAuditLog = Omit<PlatformAuditLog, "id" | "createdAt">;

export type ListPlatformAuditLogs = CursorParams & {
    actorId?: string;
    action?: PlatformAuditAction;
    targetType?: PlatformAuditTargetType;
    targetId?: string;
    from?: Date;
    to?: Date;
};
