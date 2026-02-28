/**
 * The user object attached to `request.user` after JWT validation.
 * This is a lightweight projection — not the full Prisma User model.
 */
export interface AuthenticatedUser {
    /** Supabase auth.users UUID — also the Prisma User.id */
    id: string;
    email: string;
}
