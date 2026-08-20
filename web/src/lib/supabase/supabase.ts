import { createClient } from "@supabase/supabase-js";

const isTest = import.meta.env.MODE === "test";

function resolveSupabaseConfig(value: string | undefined, testFallback: string, name: string) {
    if (value) return value;
    if (isTest) return testFallback;
    throw new Error(`${name} is required`);
}

const supabaseUrl = resolveSupabaseConfig(
    import.meta.env.VITE_SUPABASE_URL,
    "http://127.0.0.1:54321",
    "VITE_SUPABASE_URL"
);
const supabaseKey = resolveSupabaseConfig(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    "test-publishable-key",
    "VITE_SUPABASE_PUBLISHABLE_KEY"
);

export const mySupabase = createClient(supabaseUrl, supabaseKey);
