import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTreeStore } from '../../store/useTreeStore';
import { useProjectStore } from '../../store/useProjectStore';

/* ─── FileUploader Component ─────────────────────────────────── */

export function FileUploader() {
    const uploadAndParse = useTreeStore((s) => s.uploadAndParse);
    const uploadToProject = useTreeStore((s) => s.uploadToProject);
    const isLoading = useTreeStore((s) => s.isLoading);
    const error = useTreeStore((s) => s.error);
    const stats = useTreeStore((s) => s.stats);
    const sessionId = useTreeStore((s) => s.sessionId);
    const activeProjectId = useProjectStore((s) => s.activeProjectId);
    const { t } = useTranslation();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFile = useCallback(
        async (file: File) => {
            const text = await file.text();
            // If we have an active project, persist into the database
            if (activeProjectId) {
                await uploadToProject(activeProjectId, text, file.name);
            } else {
                await uploadAndParse(text, file.name);
            }
        },
        [activeProjectId, uploadToProject, uploadAndParse],
    );

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile],
    );

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const onDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const onClickUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const onFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            // Reset input so user can re-upload same file
            e.target.value = '';
        },
        [handleFile],
    );

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={onClickUpload}
                className={`
          relative
          border-2 border-dashed rounded-lg
          p-6
          text-center
          cursor-pointer
          transition-all duration-200
          ${isDragOver
                        ? 'border-nox-orange bg-nox-orange/10 scale-[1.02]'
                        : 'border-nox-surface-lighter hover:border-nox-cobalt hover:bg-nox-cobalt/5'
                    }
          ${isLoading ? 'opacity-60 pointer-events-none' : ''}
        `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ged,.gedcom"
                    onChange={onFileChange}
                    className="hidden"
                />

                {isLoading ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-2 border-nox-cobalt border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-nox-text-muted">{t('visualizer.uploader.parsing')}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <div className="text-3xl opacity-50">📁</div>
                        <p className="text-sm text-nox-text">
                            {t('visualizer.uploader.dropHint')}
                        </p>
                        <p className="text-xs text-nox-text-muted">
                            {t('visualizer.uploader.format')}
                        </p>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-nox-danger/10 border border-nox-danger/30 rounded-lg p-3">
                    <p className="text-xs text-nox-danger font-medium">⚠ {t('common.error')}</p>
                    <p className="text-xs text-nox-text-muted mt-1">{error}</p>
                </div>
            )}

            {/* Stats */}
            {stats && (
                <div className="bg-nox-surface rounded-lg border border-nox-surface-lighter p-3 space-y-2">
                    <p className="text-xs font-medium text-nox-cobalt-light uppercase tracking-wider">
                        {t('visualizer.uploader.parsedResults')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-nox-text">
                                {stats.individualsCount}
                            </p>
                            <p className="text-[10px] text-nox-text-muted uppercase">
                                {t('visualizer.uploader.individuals')}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-nox-text">
                                {stats.familiesCount}
                            </p>
                            <p className="text-[10px] text-nox-text-muted uppercase">
                                {t('visualizer.uploader.families')}
                            </p>
                        </div>
                    </div>
                    {sessionId && (
                        <p className="text-[10px] text-nox-text-muted font-mono truncate mt-1">
                            {t('visualizer.uploader.session')}: {sessionId}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
