import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TreeCanvas } from '../features/visualizer/TreeCanvas';
import { FileUploader } from '../features/uploader/FileUploader';
import { useTreeStore } from '../store/useTreeStore';
import { useProjectStore } from '../store/useProjectStore';
import { useThemeStore } from '../store/useThemeStore';
import { ThemeToggle } from '../components/ThemeToggle';

/**
 * VisualizerPage — The interactive family tree canvas.
 * Accessed at /visualizer or /visualizer/:projectId.
 *
 * When a `projectId` param is present, the page automatically hydrates
 * the React Flow canvas with persisted data from the backend.
 */
export default function VisualizerPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { projectId: routeProjectId } = useParams<{ projectId: string }>();
    const nodes = useTreeStore((s) => s.nodes);
    const { mode } = useThemeStore();
    const sessionId = useTreeStore((s) => s.sessionId);
    const isHydrating = useTreeStore((s) => s.isHydrating);
    const stats = useTreeStore((s) => s.stats);
    const reset = useTreeStore((s) => s.reset);
    const loadProject = useTreeStore((s) => s.loadProject);
    const activeProjectId = useProjectStore((s) => s.activeProjectId);
    const activeProject = useProjectStore((s) => s.projects.find((p) => p.id === s.activeProjectId));
    const setActiveProject = useProjectStore((s) => s.setActiveProject);
    const renameProject = useProjectStore((s) => s.renameProject);

    const createPerson = useTreeStore((s) => s.createPerson);
    const applyLayout = useTreeStore((s) => s.applyLayout);
    const clearCanvas = useTreeStore((s) => s.clearCanvas);

    const [showReimport, setShowReimport] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newFirstName, setNewFirstName] = useState('');
    const [newLastName, setNewLastName] = useState('');
    const [newGender, setNewGender] = useState<'M' | 'F' | 'U'>('U');
    const [isCreating, setIsCreating] = useState(false);

    // ── Inline Rename State ──
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState('');
    const renameInputRef = useRef<HTMLInputElement>(null);

    /** Whether the tree has persisted data loaded */
    const hasTreeData = nodes.length > 0;

    const handleCreatePerson = useCallback(async () => {
        if (!newFirstName.trim()) return;
        setIsCreating(true);
        try {
            await createPerson({
                firstName: newFirstName.trim(),
                lastName: newLastName.trim() || undefined,
                gender: newGender,
            });
            setNewFirstName('');
            setNewLastName('');
            setNewGender('U');
            setShowCreateForm(false);
        } finally {
            setIsCreating(false);
        }
    }, [newFirstName, newLastName, newGender, createPerson]);

    // Hydrate tree data when opening a project from the dashboard
    useEffect(() => {
        if (routeProjectId && routeProjectId !== sessionId) {
            setActiveProject(routeProjectId);
            loadProject(routeProjectId);
        }
    }, [routeProjectId, sessionId, setActiveProject, loadProject]);

    const handleBackToDashboard = () => {
        reset();
        setActiveProject(null);
        navigate('/dashboard');
    };

    const handleClearTree = () => {
        clearCanvas();
        setShowReimport(false);
    };

    // ── Inline Rename Handlers ──
    const handleStartRename = useCallback(() => {
        setEditName(activeProject?.name ?? '');
        setIsEditingName(true);
        setTimeout(() => renameInputRef.current?.select(), 50);
    }, [activeProject?.name]);

    const handleConfirmRename = useCallback(async () => {
        const trimmed = editName.trim();
        if (trimmed && activeProjectId && trimmed !== activeProject?.name) {
            await renameProject(activeProjectId, trimmed);
        }
        setIsEditingName(false);
    }, [editName, activeProjectId, activeProject?.name, renameProject]);

    const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleConfirmRename();
        if (e.key === 'Escape') setIsEditingName(false);
    }, [handleConfirmRename]);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-nox-surface">
            {/* ── Sidebar ── */}
            <aside className="w-[300px] flex-shrink-0 flex flex-col border-r border-nox-surface-lighter bg-nox-surface">
                {/* Brand Header */}
                <div className="px-4 py-4 border-b border-nox-surface-lighter">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <a
                                href="https://www.noxwork.net"
                                target="_blank"
                                rel="noopener noreferrer"
                                title={t('common.logoTooltip')}
                                className="transition-opacity hover:opacity-80 flex-shrink-0"
                            >
                                <img
                                    src={mode === 'light' ? '/noxwork_logo_blue.png' : '/noxwork_logo_white.png'}
                                    alt="Noxwork"
                                    className="h-7 w-auto object-contain"
                                />
                            </a>
                            <div>
                                <h1 className="text-sm font-bold text-nox-text tracking-tight">
                                    Noxwork GEDCOM
                                </h1>
                                <p className="text-[10px] text-nox-text-muted">
                                    {t('visualizer.sidebar.subtitle')}
                                </p>
                            </div>
                        </div>

                        {/* Back to dashboard */}
                        <div className="flex items-center gap-1">
                            <ThemeToggle />
                            <button
                                onClick={handleBackToDashboard}
                                title={t('visualizer.canvas.backToDashboard')}
                                className="
                                    p-1.5 rounded-lg text-nox-text-muted
                                    hover:text-nox-cobalt-light hover:bg-nox-surface-lighter
                                    transition-colors duration-150
                                "
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Active project indicator — now editable */}
                    {activeProjectId && (
                        <div className="mt-2">
                            {isEditingName ? (
                                <div className="flex items-center gap-1">
                                    <input
                                        ref={renameInputRef}
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={handleConfirmRename}
                                        onKeyDown={handleRenameKeyDown}
                                        placeholder={t('projectName.placeholder')}
                                        autoFocus
                                        className="
                                            flex-1 bg-nox-surface border border-nox-cobalt/40 rounded-md
                                            px-2 py-1 text-[11px] text-nox-cobalt-light font-medium
                                            focus:outline-none focus:ring-2 focus:ring-nox-cobalt/40
                                            transition-all
                                        "
                                    />
                                    <button
                                        onClick={handleConfirmRename}
                                        className="p-1 rounded text-nox-cobalt-light hover:bg-nox-cobalt/20 transition-colors"
                                        title="Save"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleStartRename}
                                    title={t('projectName.rename')}
                                    className="
                                        w-full text-left group
                                        px-2 py-1 rounded-md
                                        bg-nox-cobalt/10 border border-nox-cobalt/20
                                        hover:border-nox-cobalt/40 hover:bg-nox-cobalt/15
                                        transition-all duration-150
                                    "
                                >
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-[10px] text-nox-cobalt-light font-medium truncate flex-1">
                                            {activeProject?.name ?? t('visualizer.sidebar.projectActive')}
                                        </p>
                                        <svg className="w-3 h-3 text-nox-cobalt-light/50 group-hover:text-nox-cobalt-light transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                        </svg>
                                    </div>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Conditional Sidebar Content ── */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {hasTreeData && !showReimport ? (
                        /* ── Project Statistics Panel ── */
                        <>
                            <div>
                                <h2 className="text-xs font-semibold text-nox-text-muted uppercase tracking-wider mb-3">
                                    {t('visualizer.sidebar.treeStats')}
                                </h2>
                                <div className="bg-nox-surface-light rounded-xl border border-nox-surface-lighter p-4 space-y-4">
                                    {/* Counts */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="text-center p-3 rounded-lg bg-nox-cobalt/10 border border-nox-cobalt/20">
                                            <p className="text-2xl font-bold text-nox-cobalt-light">
                                                {stats?.individualsCount ?? nodes.length}
                                            </p>
                                            <p className="text-[10px] text-nox-text-muted uppercase mt-1">
                                                {t('visualizer.uploader.individuals')}
                                            </p>
                                        </div>
                                        <div className="text-center p-3 rounded-lg bg-nox-orange/10 border border-nox-orange/20">
                                            <p className="text-2xl font-bold text-nox-orange">
                                                {stats?.familiesCount ?? 0}
                                            </p>
                                            <p className="text-[10px] text-nox-text-muted uppercase mt-1">
                                                {t('visualizer.uploader.families')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Gender breakdown */}
                                    <div>
                                        <p className="text-[10px] text-nox-text-muted uppercase tracking-wider mb-2">
                                            {t('visualizer.sidebar.genderBreakdown')}
                                        </p>
                                        <div className="space-y-1.5">
                                            {(() => {
                                                const males = nodes.filter(n => n.data?.sex === 'M').length;
                                                const females = nodes.filter(n => n.data?.sex === 'F').length;
                                                const unknown = nodes.filter(n => n.data?.sex === 'U').length;
                                                const total = nodes.length || 1;
                                                return (
                                                    <>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-sm bg-nox-male flex-shrink-0" />
                                                            <div className="flex-1 h-1.5 rounded-full bg-nox-surface-lighter overflow-hidden">
                                                                <div
                                                                    className="h-full bg-nox-male rounded-full transition-all duration-500"
                                                                    style={{ width: `${(males / total) * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] text-nox-text-muted w-6 text-right">{males}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-sm bg-nox-female flex-shrink-0" />
                                                            <div className="flex-1 h-1.5 rounded-full bg-nox-surface-lighter overflow-hidden">
                                                                <div
                                                                    className="h-full bg-nox-female rounded-full transition-all duration-500"
                                                                    style={{ width: `${(females / total) * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] text-nox-text-muted w-6 text-right">{females}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-sm bg-nox-unknown flex-shrink-0" />
                                                            <div className="flex-1 h-1.5 rounded-full bg-nox-surface-lighter overflow-hidden">
                                                                <div
                                                                    className="h-full bg-nox-unknown rounded-full transition-all duration-500"
                                                                    style={{ width: `${(unknown / total) * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] text-nox-text-muted w-6 text-right">{unknown}</span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Create New Person ── */}
                            <div>
                                <h2 className="text-xs font-semibold text-nox-text-muted uppercase tracking-wider mb-3">
                                    {t('editor.addPerson')}
                                </h2>
                                {!showCreateForm ? (
                                    <button
                                        onClick={() => setShowCreateForm(true)}
                                        className="
                                            w-full py-2.5 rounded-xl text-sm font-semibold
                                            bg-nox-orange hover:bg-nox-orange-dark text-white
                                            shadow-lg shadow-nox-orange/20
                                            transition-all duration-200
                                            flex items-center justify-center gap-2
                                        "
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                        {t('editor.addPerson')}
                                    </button>
                                ) : (
                                    <div className="bg-nox-surface-light rounded-xl border border-nox-surface-lighter p-3 space-y-3">
                                        <input
                                            value={newFirstName}
                                            onChange={(e) => setNewFirstName(e.target.value)}
                                            placeholder={t('editor.firstNamePlaceholder')}
                                            autoFocus
                                            className="
                                                w-full bg-nox-surface border border-nox-surface-lighter rounded-lg
                                                px-3 py-2 text-sm text-nox-text placeholder:text-nox-text-muted
                                                focus:outline-none focus:ring-2 focus:ring-nox-cobalt/40 focus:border-nox-cobalt
                                                transition-all
                                            "
                                        />
                                        <input
                                            value={newLastName}
                                            onChange={(e) => setNewLastName(e.target.value)}
                                            placeholder={t('editor.lastNamePlaceholder')}
                                            className="
                                                w-full bg-nox-surface border border-nox-surface-lighter rounded-lg
                                                px-3 py-2 text-sm text-nox-text placeholder:text-nox-text-muted
                                                focus:outline-none focus:ring-2 focus:ring-nox-cobalt/40 focus:border-nox-cobalt
                                                transition-all
                                            "
                                        />
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {([['M', '♂'], ['F', '♀'], ['U', '?']] as const).map(([v, icon]) => (
                                                <button
                                                    key={v}
                                                    type="button"
                                                    onClick={() => setNewGender(v)}
                                                    className={`
                                                        py-1.5 rounded-lg text-xs font-medium border transition-all
                                                        ${newGender === v
                                                            ? 'bg-nox-cobalt/20 border-nox-cobalt text-nox-cobalt-light'
                                                            : 'bg-nox-surface border-nox-surface-lighter text-nox-text-muted'
                                                        }
                                                    `}
                                                >
                                                    {icon}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setShowCreateForm(false); setNewFirstName(''); setNewLastName(''); }}
                                                className="flex-1 py-2 rounded-lg text-xs text-nox-text-muted border border-nox-surface-lighter hover:text-nox-text transition-colors"
                                            >
                                                {t('common.cancel')}
                                            </button>
                                            <button
                                                onClick={handleCreatePerson}
                                                disabled={!newFirstName.trim() || isCreating}
                                                className="
                                                    flex-1 py-2 rounded-lg text-xs font-semibold
                                                    bg-nox-orange hover:bg-nox-orange-dark text-white
                                                    disabled:opacity-50 disabled:cursor-not-allowed
                                                    transition-all
                                                "
                                            >
                                                {isCreating ? '...' : t('editor.create')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── Auto Organize ── */}
                            <div>
                                <button
                                    onClick={applyLayout}
                                    className="
                                        w-full py-2 rounded-xl text-xs font-medium
                                        bg-nox-cobalt/10 border border-nox-cobalt/20
                                        text-nox-cobalt-light hover:bg-nox-cobalt/20
                                        transition-all duration-200
                                        flex items-center justify-center gap-2
                                    "
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                                    </svg>
                                    {t('visualizer.sidebar.autoOrganize')}
                                </button>
                            </div>

                            {/* Legend */}
                            <div className="mt-2">
                                <h2 className="text-xs font-semibold text-nox-text-muted uppercase tracking-wider mb-3">
                                    {t('visualizer.sidebar.legend')}
                                </h2>
                                <div className="space-y-2 text-xs text-nox-text-muted">
                                    <div className="flex items-center gap-2 pt-1">
                                        <div className="w-8 h-0.5 bg-nox-cobalt" />
                                        <span>{t('visualizer.legend.parentChild')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-0.5 border-t-2 border-dashed border-nox-orange" />
                                        <span>{t('visualizer.legend.spouse')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center bg-nox-warning text-nox-surface text-[8px] font-bold px-1 rounded-full">
                                            ⚠ 2
                                        </span>
                                        <span>{t('visualizer.legend.multiRole')}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* ── Empty State / Import Panel ── */
                        <>
                            {/* ── Create First Person (shown when tree is empty) ── */}
                            {!hasTreeData && sessionId && (
                                <div>
                                    <h2 className="text-xs font-semibold text-nox-text-muted uppercase tracking-wider mb-3">
                                        {t('editor.addPerson')}
                                    </h2>
                                    <div className="bg-nox-surface-light rounded-xl border border-nox-surface-lighter p-4 space-y-3">
                                        <p className="text-xs text-nox-text-muted leading-relaxed">
                                            {t('visualizer.canvas.emptyTreeHint')}
                                        </p>
                                        {!showCreateForm ? (
                                            <button
                                                onClick={() => setShowCreateForm(true)}
                                                className="
                                                    w-full py-2.5 rounded-xl text-sm font-semibold
                                                    bg-nox-orange hover:bg-nox-orange-dark text-white
                                                    shadow-lg shadow-nox-orange/20
                                                    transition-all duration-200
                                                    flex items-center justify-center gap-2
                                                "
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                </svg>
                                                {t('editor.addPerson')}
                                            </button>
                                        ) : (
                                            <div className="space-y-3">
                                                <input
                                                    value={newFirstName}
                                                    onChange={(e) => setNewFirstName(e.target.value)}
                                                    placeholder={t('editor.firstNamePlaceholder')}
                                                    autoFocus
                                                    className="
                                                        w-full bg-nox-surface border border-nox-surface-lighter rounded-lg
                                                        px-3 py-2 text-sm text-nox-text placeholder:text-nox-text-muted
                                                        focus:outline-none focus:ring-2 focus:ring-nox-cobalt/40 focus:border-nox-cobalt
                                                        transition-all
                                                    "
                                                />
                                                <input
                                                    value={newLastName}
                                                    onChange={(e) => setNewLastName(e.target.value)}
                                                    placeholder={t('editor.lastNamePlaceholder')}
                                                    className="
                                                        w-full bg-nox-surface border border-nox-surface-lighter rounded-lg
                                                        px-3 py-2 text-sm text-nox-text placeholder:text-nox-text-muted
                                                        focus:outline-none focus:ring-2 focus:ring-nox-cobalt/40 focus:border-nox-cobalt
                                                        transition-all
                                                    "
                                                />
                                                <div className="grid grid-cols-3 gap-1.5">
                                                    {([['M', '♂'], ['F', '♀'], ['U', '?']] as const).map(([v, icon]) => (
                                                        <button
                                                            key={v}
                                                            type="button"
                                                            onClick={() => setNewGender(v)}
                                                            className={`
                                                                py-1.5 rounded-lg text-xs font-medium border transition-all
                                                                ${newGender === v
                                                                    ? 'bg-nox-cobalt/20 border-nox-cobalt text-nox-cobalt-light'
                                                                    : 'bg-nox-surface border-nox-surface-lighter text-nox-text-muted'
                                                                }
                                                            `}
                                                        >
                                                            {icon}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setShowCreateForm(false); setNewFirstName(''); setNewLastName(''); }}
                                                        className="flex-1 py-2 rounded-lg text-xs text-nox-text-muted border border-nox-surface-lighter hover:text-nox-text transition-colors"
                                                    >
                                                        {t('common.cancel')}
                                                    </button>
                                                    <button
                                                        onClick={handleCreatePerson}
                                                        disabled={!newFirstName.trim() || isCreating}
                                                        className="
                                                            flex-1 py-2 rounded-lg text-xs font-semibold
                                                            bg-nox-orange hover:bg-nox-orange-dark text-white
                                                            disabled:opacity-50 disabled:cursor-not-allowed
                                                            transition-all
                                                        "
                                                    >
                                                        {isCreating ? '...' : t('editor.create')}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-nox-text-muted text-center opacity-70 pt-1">
                                            {t('visualizer.canvas.orImportGedcom')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Import Section */}
                            <div>
                                <h2 className="text-xs font-semibold text-nox-text-muted uppercase tracking-wider mb-3">
                                    {t('visualizer.sidebar.import')}
                                </h2>
                                <FileUploader />
                            </div>

                            {/* Legend */}
                            <div className="mt-6">
                                <h2 className="text-xs font-semibold text-nox-text-muted uppercase tracking-wider mb-3">
                                    {t('visualizer.sidebar.legend')}
                                </h2>
                                <div className="space-y-2 text-xs text-nox-text-muted">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-sm bg-nox-male" />
                                        <span>{t('visualizer.legend.male')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-sm bg-nox-female" />
                                        <span>{t('visualizer.legend.female')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-sm bg-nox-unknown" />
                                        <span>{t('visualizer.legend.unknown')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-nox-surface-lighter">
                                        <div className="w-8 h-0.5 bg-nox-cobalt" />
                                        <span>{t('visualizer.legend.parentChild')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-0.5 border-t-2 border-dashed border-nox-orange" />
                                        <span>{t('visualizer.legend.spouse')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center bg-nox-warning text-nox-surface text-[8px] font-bold px-1 rounded-full">
                                            ⚠ 2
                                        </span>
                                        <span>{t('visualizer.legend.multiRole')}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* ── Footer Actions ── */}
                {sessionId && (
                    <div className="p-4 border-t border-nox-surface-lighter space-y-2">
                        {hasTreeData && !showReimport && (
                            <button
                                onClick={() => setShowReimport(true)}
                                className="
                                    w-full text-xs text-nox-text-muted
                                    hover:text-nox-orange
                                    border border-nox-surface-lighter
                                    hover:border-nox-orange/50
                                    rounded-lg py-2
                                    transition-colors duration-200
                                    flex items-center justify-center gap-1.5
                                "
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                                </svg>
                                {t('visualizer.sidebar.reimport')}
                            </button>
                        )}
                        {showReimport && (
                            <button
                                onClick={() => setShowReimport(false)}
                                className="
                                    w-full text-xs text-nox-text-muted
                                    hover:text-nox-cobalt-light
                                    border border-nox-surface-lighter
                                    hover:border-nox-cobalt/50
                                    rounded-lg py-2
                                    transition-colors duration-200
                                "
                            >
                                {t('common.cancel')}
                            </button>
                        )}
                        <button
                            onClick={handleClearTree}
                            className="
                                w-full text-xs text-nox-text-muted
                                hover:text-nox-danger
                                border border-nox-surface-lighter
                                hover:border-nox-danger/50
                                rounded-lg py-2
                                transition-colors duration-200
                            "
                        >
                            {t('visualizer.canvas.clearCanvas')}
                        </button>
                    </div>
                )}
            </aside>

            {/* ── Main Canvas ── */}
            <main className="flex-1 relative">
                {isHydrating ? (
                    /* Noxwork Orange loading spinner during project hydration */
                    <div className="absolute inset-0 flex items-center justify-center bg-nox-surface">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-14 h-14 border-[3px] border-nox-orange/30 border-t-nox-orange rounded-full animate-spin" />
                            <p className="text-sm text-nox-text-muted font-medium animate-pulse">
                                {t('visualizer.canvas.loadingProject')}
                            </p>
                        </div>
                    </div>
                ) : sessionId ? (
                    <TreeCanvas projectName={activeProject?.name} />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center space-y-4 max-w-md">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-nox-cobalt/20 to-nox-orange/20 border border-nox-surface-lighter flex items-center justify-center">
                                <span className="text-3xl opacity-50">🌳</span>
                            </div>
                            <h2 className="text-xl font-semibold text-nox-text">
                                {t('visualizer.canvas.noTree')}
                            </h2>
                            <p className="text-sm text-nox-text-muted leading-relaxed">
                                {t('visualizer.canvas.uploadHint')}
                                <br />
                                {t('visualizer.canvas.uploadDrag')}{' '}
                                <span className="text-nox-orange font-medium">.ged</span>
                                {' '}{t('visualizer.canvas.uploadDragSuffix')}
                            </p>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="
                                    mt-2 px-4 py-2 rounded-xl text-sm font-medium
                                    bg-nox-cobalt/10 border border-nox-cobalt/20 text-nox-cobalt-light
                                    hover:bg-nox-cobalt/20 transition-colors duration-200
                                "
                            >
                                {t('visualizer.canvas.backToDashboard')}
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
