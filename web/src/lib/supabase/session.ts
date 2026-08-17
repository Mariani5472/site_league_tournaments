import type { Session } from "@supabase/supabase-js";

type SupabaseSessionRow = Pick<Session, "access_token">;

export function getAccessToken(session: SupabaseSessionRow | null): string | undefined {
    return session?.access_token;
}
