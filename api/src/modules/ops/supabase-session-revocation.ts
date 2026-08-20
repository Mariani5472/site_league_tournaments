export interface SessionRevocationGateway {
    revokeUserSessions(userId: string): Promise<void>;
}

export class SupabaseSessionRevocationGateway implements SessionRevocationGateway {
    async revokeUserSessions(userId: string) {
        const url = process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !serviceRoleKey) throw new Error("Supabase Admin API is not configured");
        const response = await fetch(`${url}/auth/v1/admin/users/${userId}/logout`, {
            method: "POST",
            headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
        });
        if (!response.ok) throw new Error(`Supabase Admin API returned ${response.status}`);
    }
}
