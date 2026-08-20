import { z } from "zod";
import { cursorPaginationSchema } from "../../schemas/pagination.schemas";

export const platformRoleParamsSchema = z.object({ userId: z.uuid() }).strict();
export const opsUserParamsSchema = z.object({ userId: z.uuid() }).strict();
export const opsLeagueParamsSchema = z.object({ leagueId: z.uuid() }).strict();
const secretLikeReason =
    /(?:bearer\s+|(?:token|secret|password|api[_-]?key)\s*[:=]|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.)/i;
export const platformRoleMutationSchema = z.object({
    reason: z.string().trim().min(10).max(500).refine(reason => !secretLikeReason.test(reason), {
        message: "reason must not contain credentials or tokens",
    }),
}).strict();

export const platformAuditQuerySchema = cursorPaginationSchema
    .extend({
        actorId: z.uuid().optional(),
        action: z.enum([
            "platform_role.granted",
            "platform_role.revoked",
            "user.suspended",
            "user.unsuspended",
        ]).optional(),
        targetType: z.enum(["user"]).optional(),
        targetId: z.uuid().optional(),
        from: z.iso.datetime({ offset: true }).transform(value => new Date(value)).optional(),
        to: z.iso.datetime({ offset: true }).transform(value => new Date(value)).optional(),
    })
    .refine(query => !query.from || !query.to || query.from <= query.to, {
        message: "from must be before or equal to to",
        path: ["from"],
    });

export const opsUsersQuerySchema = cursorPaginationSchema.extend({
    search: z.string().trim().max(100).default(""),
    platformRole: z.enum(["super_admin", "none"]).optional(),
});

export const opsLeaguesQuerySchema = cursorPaginationSchema.extend({
    search: z.string().trim().max(100).default(""),
    visibility: z.enum(["public", "private"]).optional(),
    operationalStatus: z.enum(["active", "idle"]).optional(),
});

export const userSuspensionSchema = z.object({
    reason: platformRoleMutationSchema.shape.reason,
    suspendedUntil: z.iso.datetime({ offset: true }).transform(value => new Date(value)),
}).strict();

export const userUnsuspensionSchema = platformRoleMutationSchema;
