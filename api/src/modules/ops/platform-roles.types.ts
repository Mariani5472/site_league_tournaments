export type PlatformRole = "super_admin";

export type PlatformRoleAssignment = {
    id: string;
    userId: string;
    role: PlatformRole;
    createdAt: Date;
    createdBy: string | null;
    revokedAt: Date | null;
    revokedBy: string | null;
};
