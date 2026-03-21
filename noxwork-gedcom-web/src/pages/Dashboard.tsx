import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { useProjectStore } from '../store/useProjectStore';
import { useUserStore } from '../store/useUserStore';
import { useToast } from '../components/Toast';
import { UserAvatar } from '../components/UserAvatar';
import { SkeletonText } from '../components/Skeleton';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ProjectTable } from '../features/dashboard/ProjectTable';
import { EmptyState } from '../features/dashboard/EmptyState';
import { ThemeToggle } from '../components/ThemeToggle';
import { useThemeStore } from '../store/useThemeStore';

/* ─── Create Project Modal ────────────────────────────────────── */

interface CreateModalProps {
    onClose: () => void;
}

function CreateProjectModal({ onClose }: CreateModalProps) {
    const { createProject } = useProjectStore();
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSubmitting(true);
        await createProject(name.trim(), description.trim() || undefined);
        setIsSubmitting(false);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-nox-surface-light border border-nox-surface-lighter rounded-2xl shadow-2xl w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-bold text-nox-text mb-1">{t('dashboard.modal.title')}</h2>
                <p className="text-nox-text-muted text-sm mb-5">
                    {t('dashboard.modal.subtitle')}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-nox-text-muted uppercase tracking-wider block mb-1.5">
                            {t('dashboard.modal.nameLabel')} *
                        </label>
                        <input
                            ref={inputRef}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('dashboard.modal.namePlaceholder')}
                            maxLength={120}
                            className="
                                w-full bg-nox-surface border border-nox-surface-lighter rounded-xl
                                px-4 py-2.5 text-sm text-nox-text placeholder:text-nox-text-muted
                                focus:outline-none focus:ring-2 focus:ring-nox-cobalt/40 focus:border-nox-cobalt
                                transition-all
                            "
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-nox-text-muted uppercase tracking-wider block mb-1.5">
                            {t('dashboard.modal.descLabel')} <span className="normal-case font-normal">{t('common.optional')}</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('dashboard.modal.descPlaceholder')}
                            rows={2}
                            maxLength={500}
                            className="
                                w-full bg-nox-surface border border-nox-surface-lighter rounded-xl
                                px-4 py-2.5 text-sm text-nox-text placeholder:text-nox-text-muted
                                focus:outline-none focus:ring-2 focus:ring-nox-cobalt/40 focus:border-nox-cobalt
                                resize-none transition-all
                            "
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="
                                    flex-1 py-2.5 rounded-xl text-sm font-medium
                                    bg-nox-surface border border-nox-surface-lighter
                                    text-nox-text-muted hover:text-nox-text hover:border-nox-text-muted
                                    transition-colors duration-200
                                "
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || isSubmitting}
                            className="
                                    flex-1 py-2.5 rounded-xl text-sm font-semibold
                                    bg-nox-orange hover:bg-nox-orange-dark text-white
                                    shadow-lg shadow-nox-orange/20
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    transition-all duration-200
                                "
                        >
                            {isSubmitting ? t('dashboard.modal.creating') : t('dashboard.modal.createTree')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Dashboard ───────────────────────────────────────────────── */

export default function Dashboard() {
    const { t } = useTranslation();
    const { user, session, signOut, resendConfirmation } = useAuthStore();
    const { projects, isLoading, error, fetchProjects, clearError } = useProjectStore();
    const { profile, isLoadingProfile, fetchProfile } = useUserStore();
    const { mode } = useThemeStore();
    const { addToast } = useToast();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isResending, setIsResending] = useState(false);

    const isUnconfirmed = user !== null && !user.email_confirmed_at;

    const handleResendConfirmation = async () => {
        if (!user?.email) return;
        setIsResending(true);
        const result = await resendConfirmation(user.email);
        if (result.error) {
            addToast(result.error, 'error');
        } else {
            addToast('Confirmation email resent! Check your inbox.', 'success');
        }
        setIsResending(false);
    };

    // Load projects on mount
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // Fetch Prisma profile once the session is ready
    useEffect(() => {
        if (session) fetchProfile();
    }, [session, fetchProfile]);

    const filtered = projects.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    // Derive display values — profile (Prisma) takes priority over Supabase metadata
    const avatarUrl = (user?.user_metadata?.['avatar_url'] as string | undefined) ?? null;
    const ownerDisplayName = profile
        ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email
        : user?.email ?? '';

    return (
        <div className="min-h-screen bg-nox-surface flex flex-col">
            {/* ── Top Nav ── */}
            <header className="sticky top-0 z-30 bg-nox-surface/90 backdrop-blur-md border-b border-nox-surface-lighter">
                <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
                    {/* Logo Section */}
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                        <a
                            href="https://www.noxwork.net"
                            target="_blank"
                            rel="noopener noreferrer"
                            title={t('common.logoTooltip')}
                            className="transition-opacity hover:opacity-80"
                        >
                            <img
                                src={mode === 'light' ? '/radixflow_blue.png' : '/radixflow_white.png'}
                                alt="RadixFlow"
                                className="h-14 w-auto object-contain"
                            />
                        </a>
                    </div>

                    {/* Search */}
                    <div className="flex-1 max-w-xs relative">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nox-text-muted pointer-events-none"
                            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1116.65 16.65z" />
                        </svg>
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('dashboard.nav.searchPlaceholder')}
                            className="
                                w-full bg-nox-surface-light border border-nox-surface-lighter rounded-lg
                                pl-8 pr-3 py-1.5 text-xs text-nox-text placeholder:text-nox-text-muted
                                focus:outline-none focus:ring-1 focus:ring-nox-cobalt/50 focus:border-nox-cobalt
                                transition-all
                            "
                        />
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="
                                flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                bg-nox-orange hover:bg-nox-orange-dark text-white
                                text-xs font-semibold transition-colors duration-200
                                shadow-lg shadow-nox-orange/20
                            "
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            <span className="hidden sm:inline">{t('dashboard.nav.newTree')}</span>
                        </button>

                        {/* User avatar + sign out */}
                        <div className="flex items-center gap-2 pl-2 border-l border-nox-surface-lighter">
                            <ThemeToggle />
                            <LanguageSwitcher />
                            <UserAvatar
                                avatarUrl={avatarUrl}
                                firstName={profile?.firstName}
                                lastName={profile?.lastName}
                                email={user?.email}
                                size="sm"
                                loading={isLoadingProfile}
                            />
                            <button
                                onClick={signOut}
                                className="text-xs text-nox-text-muted hover:text-nox-danger transition-colors"
                                title={t('common.signOut')}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Main Content ── */}
            <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
                {/* Welcome greeting */}
                <div className="mb-6">
                    {isLoadingProfile ? (
                        <SkeletonText className="w-48 h-7 mb-1" />
                    ) : (
                        <h1 className="text-2xl font-bold text-nox-text">
                            {t('dashboard.greetingPrefix')}{' '}
                            <span className="text-nox-orange">
                                {profile?.firstName ?? user?.email?.split('@')[0] ?? 'there'}
                            </span>
                            {' '}👋
                        </h1>
                    )}
                </div>

                {/* Page title */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-nox-text">
                            {t('dashboard.projects.title')}
                        </h2>
                        <p className="text-nox-text-muted text-sm mt-0.5">
                            {projects.length > 0
                                ? t('dashboard.projects.subtitle', { count: projects.length })
                                : t('dashboard.projects.empty')}
                        </p>
                    </div>

                    {projects.length > 0 && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="
                                hidden md:flex items-center gap-2 px-4 py-2 rounded-xl
                                bg-nox-orange hover:bg-nox-orange-dark text-white
                                text-sm font-semibold
                                shadow-lg shadow-nox-orange/20
                                transition-colors duration-200
                            "
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            {t('dashboard.nav.newTree')}
                        </button>
                    )}
                </div>

                {/* ── Awaiting email confirmation banner ── */}
                {isUnconfirmed && (
                    <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-nox-warning/40 bg-nox-warning/10 px-4 py-3">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-nox-warning flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                            <div>
                                <p className="text-sm font-semibold text-nox-warning">{t('dashboard.confirmation.bannerTitle')}</p>
                                <p className="text-xs text-nox-text-muted mt-0.5">
                                    {t('dashboard.confirmation.bannerSubtitle', { email: user?.email ? `(${user.email})` : '' })}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleResendConfirmation}
                            disabled={isResending}
                            className="
                                flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg
                                border border-nox-warning/50 text-nox-warning
                                hover:bg-nox-warning/20 transition-colors
                                disabled:opacity-50 disabled:cursor-not-allowed
                            "
                        >
                            {isResending ? t('dashboard.confirmation.resending') : t('dashboard.confirmation.resend')}
                        </button>
                    </div>
                )}

                {/* Error banner */}
                {error && (
                    <div className="mb-4 flex items-center justify-between bg-nox-danger/10 border border-nox-danger/30 rounded-xl px-4 py-3">
                        <p className="text-sm text-nox-danger">{error}</p>
                        <button onClick={clearError} className="text-nox-danger hover:text-nox-danger/70">✕</button>
                    </div>
                )}

                {/* Loading skeleton */}
                {isLoading && (
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 rounded-xl bg-nox-surface-light animate-pulse" />
                        ))}
                    </div>
                )}

                {/* Content */}
                {!isLoading && (
                    <>
                        {projects.length === 0 ? (
                            <EmptyState onCreated={() => fetchProjects()} />
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-16 text-nox-text-muted">
                                <p className="text-base">{t('dashboard.projects.noMatch', { query: searchQuery })}</p>
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="mt-2 text-sm text-nox-cobalt-light hover:underline"
                                >
                                    {t('dashboard.actions.clearSearch')}
                                </button>
                            </div>
                        ) : (
                            <ProjectTable
                                projects={filtered}
                                ownerDisplayName={ownerDisplayName}
                                ownerAvatarUrl={avatarUrl}
                            />
                        )}
                    </>
                )}
            </main>

            {/* ── Footer ── */}
            <footer className="border-t border-nox-surface-lighter py-4 px-6">
                <p className="text-center text-[11px] text-nox-text-muted">
                    {t('dashboard.footerPrefix')}
                    <a
                        href="https://www.noxwork.net"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nox-cobalt-light hover:underline transition-colors"
                    >
                        {t('dashboard.footerLink')}
                    </a>
                    {t('dashboard.footerSuffix')}
                </p>
            </footer>

            {/* ── Modals ── */}
            {showCreateModal && (
                <CreateProjectModal onClose={() => setShowCreateModal(false)} />
            )}
        </div>
    );
}
