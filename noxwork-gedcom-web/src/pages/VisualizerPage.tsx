import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TreeCanvas } from '../features/visualizer/TreeCanvas';
import { FileUploader } from '../features/uploader/FileUploader';
import { useTreeStore } from '../store/useTreeStore';
import { useProjectStore } from '../store/useProjectStore';

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
    const { id: routeProjectId } = useParams<{ id: string }>();
    const sessionId = useTreeStore((s) => s.sessionId);
    const isHydrating = useTreeStore((s) => s.isHydrating);
    const reset = useTreeStore((s) => s.reset);
    const loadProject = useTreeStore((s) => s.loadProject);
    const activeProjectId = useProjectStore((s) => s.activeProjectId);
    const activeProject = useProjectStore((s) => s.projects.find((p) => p.id === s.activeProjectId));
    const setActiveProject = useProjectStore((s) => s.setActiveProject);

    // Hydrate tree data when opening a project from the dashboard
    useEffect(() => {
        if (routeProjectId && routeProjectId !== sessionId) {
            setActiveProject(routeProjectId);
            loadProject(routeProjectId);
        }
    }, [routeProjectId, sessionId, setActiveProject, loadProject]);

    const handleBackToDashboard = () => {
        reset();
        navigate('/dashboard');
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-nox-surface">
            {/* ── Sidebar ── */}
            <aside className="w-[300px] flex-shrink-0 flex flex-col border-r border-nox-surface-lighter bg-nox-surface">
                {/* Brand Header */}
                <div className="px-4 py-4 border-b border-nox-surface-lighter">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <img
                                src="/noxwork_logo_white.png"
                                alt="Noxwork"
                                className="h-7 w-auto object-contain flex-shrink-0"
                            />
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

                    {/* Active project indicator */}
                    {activeProjectId && (
                        <div className="mt-2 px-2 py-1 rounded-md bg-nox-cobalt/10 border border-nox-cobalt/20">
                            <p className="text-[10px] text-nox-cobalt-light font-medium truncate">
                                {activeProject?.name ?? t('visualizer.sidebar.projectActive')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Upload Section */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                </div>

                {/* Footer */}
                {sessionId && (
                    <div className="p-4 border-t border-nox-surface-lighter">
                        <button
                            onClick={reset}
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
                    /* Noxwork Cobalt Blue loading spinner during project hydration */
                    <div className="absolute inset-0 flex items-center justify-center bg-nox-surface">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-[3px] border-nox-cobalt/30 border-t-nox-cobalt rounded-full animate-spin" />
                            <p className="text-sm text-nox-text-muted font-medium">
                                {t('visualizer.canvas.loadingProject')}
                            </p>
                        </div>
                    </div>
                ) : sessionId ? (
                    <TreeCanvas />
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
