import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        '[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env\n' +
        'Copy .env.example → .env and fill in your Supabase project credentials.',
    );
}

/**
 * Singleton Supabase client.
 * Import this everywhere you need auth or DB access.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Returns the current session's access_token (Supabase JWT) for API calls.
 * Returns null if no session is active.
 */
export async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
}
