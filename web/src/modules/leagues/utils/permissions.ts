export const roleHierarchy = {
    owner: 4,
    admin: 3,
    player: 2,
    spec: 1,
};
export function canManageRole(currentRole: string, targetRole: string) {
    return (
        roleHierarchy[currentRole as keyof typeof roleHierarchy] >
        roleHierarchy[targetRole as keyof typeof roleHierarchy]
    );
}
