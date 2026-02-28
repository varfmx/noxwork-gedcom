/**
 * Shape of the JWT payload issued by Supabase Auth.
 *
 * Supabase signs tokens with ES256 using asymmetric keys (JWKS endpoint).
 * The `sub` claim holds the Supabase auth.users UUID.
 * The `role` claim is "authenticated" for logged-in users.
 *
 * Post-password-reset: Supabase issues a fresh JWT after the user updates
 * their password. The new token has a new `session_id` and updated `iat`.
 * `aal` (Authentication Assurance Level) may change to 'aal1' to reflect
 * that re-authentication occurred via the recovery flow.
 */
export interface JwtPayload {
    /** Supabase auth.users UUID */
    sub: string;
    email: string;
    role: string; // "authenticated" | "anon" | "service_role"
    iat?: number;
    exp?: number;
    /** Supabase-specific: session ID (changes after password reset) */
    session_id?: string;
    /**
     * Authentication Assurance Level.
     * 'aal1' = single factor (standard after email/password or OAuth).
     * 'aal2' = multi-factor. After password reset, Supabase resets to 'aal1'.
     */
    aal?: 'aal1' | 'aal2';
    /** Authentication Methods References — tracks how the session was created */
    amr?: Array<{ method: string; timestamp: number }>;
    /** App-level metadata set in Supabase Dashboard */
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
}

