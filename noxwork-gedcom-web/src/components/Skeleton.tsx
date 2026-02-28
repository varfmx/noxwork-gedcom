/**
 * Skeleton — lightweight shimmer placeholder components for loading states.
 *
 * Keeps the premium Noxwork feel while async data is in-flight.
 * All variants use a CSS animation defined in index.css (or Tailwind's
 * built-in `animate-pulse`). For a richer shimmer, we layer a gradient
 * sweep on top via `shimmer` class.
 */

interface SkeletonProps {
    /** Additional Tailwind classes for sizing / shape */
    className?: string;
}

/**
 * Base rectangular skeleton block with shimmer animation.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`
                relative overflow-hidden
                bg-nox-surface-lighter rounded-lg
                before:absolute before:inset-0
                before:bg-gradient-to-r before:from-transparent
                before:via-white/[0.06] before:to-transparent
                before:translate-x-[-100%] before:animate-[shimmer_1.6s_infinite]
                ${className}
            `}
        />
    );
}

/**
 * Circular skeleton — for avatar placeholders.
 */
export function SkeletonCircle({ className = '' }: SkeletonProps) {
    return <Skeleton className={`rounded-full ${className}`} />;
}

/**
 * One line of text-width skeleton.
 */
export function SkeletonText({ className = '' }: SkeletonProps) {
    return <Skeleton className={`h-3.5 rounded-md ${className}`} />;
}
