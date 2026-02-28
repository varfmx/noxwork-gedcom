/**
 * Shape of the JWT payload issued by Supabase Auth.
 *
 * Supabase signs tokens with HS256 using the project's `JWT_SECRET`.
 * The `sub` claim holds the Supabase auth.users UUID.
 * The `role` claim is "authenticated" for logged-in users.
 */
export interface JwtPayload {
    /** Supabase auth.users UUID */
    sub: string;
    email: string;
    role: string; // "authenticated" | "anon" | "service_role"
    iat?: number;
    exp?: number;
    /** Supabase-specific: session ID */
    session_id?: string;
    /** App-level metadata set in Supabase Dashboard */
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
}
