import { useState } from 'react';
import { SkeletonCircle } from './Skeleton';

/* ─── Size variants ──────────────────────────────────────────── */

const SIZE_MAP = {
    sm: { container: 'w-7 h-7', text: 'text-[10px]' },
    md: { container: 'w-9 h-9', text: 'text-xs' },
    lg: { container: 'w-11 h-11', text: 'text-sm' },
} as const;

type AvatarSize = keyof typeof SIZE_MAP;

/* ─── Props ──────────────────────────────────────────────────── */

interface UserAvatarProps {
    /** Google/OAuth profile picture URL from Supabase user_metadata.avatar_url */
    avatarUrl?: string | null;
    /** User's first name (used for initials fallback) */
    firstName?: string | null;
    /** User's last name (used in title tooltip) */
    lastName?: string | null;
    /** Email used as last-resort fallback initial and tooltip */
    email?: string | null;
    size?: AvatarSize;
    /** When true, renders a shimmer skeleton instead of the avatar */
    loading?: boolean;
    className?: string;
}

/* ─── Component ──────────────────────────────────────────────── */

/**
 * UserAvatar — displays the user's profile picture or a gradient initial.
 *
 * Priority for avatar source:
 *  1. `avatarUrl` (Google SSO profile photo from Supabase user_metadata)
 *  2. Gradient circle with initials derived from firstName / email
 *
 * Shows a shimmer skeleton while `loading` is true.
 */
export function UserAvatar({
    avatarUrl,
    firstName,
    lastName,
    email,
    size = 'md',
    loading = false,
    className = '',
}: UserAvatarProps) {
    const { container, text } = SIZE_MAP[size];
    const [imgError, setImgError] = useState(false);

    if (loading) {
        return <SkeletonCircle className={`${container} ${className}`} />;
    }

    const displayName = [firstName, lastName].filter(Boolean).join(' ') || email || '';
    const initial = firstName?.[0]?.toUpperCase()
        ?? email?.[0]?.toUpperCase()
        ?? '?';

    const showImage = !!avatarUrl && !imgError;

    return (
        <div
            className={`${container} rounded-full flex-shrink-0 overflow-hidden ${className}`}
            title={displayName}
        >
            {showImage ? (
                <img
                    src={avatarUrl!}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                />
            ) : (
                <div
                    className={`
                        w-full h-full rounded-full
                        bg-gradient-to-br from-nox-cobalt to-nox-orange
                        flex items-center justify-center
                        text-white font-bold select-none
                        ${text}
                    `}
                >
                    {initial}
                </div>
            )}
        </div>
    );
}
