import { useState, useRef } from 'react';
import { useProjectStore } from '../../store/useProjectStore';

interface EmptyStateProps {
    onCreated?: () => void;
}

/**
 * EmptyState — Shown when the authenticated user has no projects yet.
 */
export function EmptyState({ onCreated }: EmptyStateProps) {
    const { createProject } = useProjectStore();
    const [isCreating, setIsCreating] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [showNameInput, setShowNameInput] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleCreate = async () => {
        const name = projectName.trim() || 'New Family Tree';
        setIsCreating(true);
        await createProject(name);
        setIsCreating(false);
        setProjectName('');
        setShowNameInput(false);
        onCreated?.();
    };

    const handleUploadClick = () => {
        // Navigate to visualizer — user will upload via the sidebar
        window.location.href = '/visualizer';
    };

    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            {/* Illustration */}
            <div className="relative mb-8">
                <div className="w-28 h-28 rounded-3xl bg-nox-cobalt/10 border border-nox-cobalt/20 flex items-center justify-center">
                    <svg
                        className="w-14 h-14 text-nox-cobalt/60"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                        />
                    </svg>
                </div>

                {/* Decorative orbiting dots */}
                <div className="absolute top-0 right-0 w-4 h-4 rounded-full bg-nox-orange/60 translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-2 w-3 h-3 rounded-full bg-nox-cobalt/50" />
            </div>

            {/* Copy */}
            <h2 className="text-xl font-bold text-nox-text mb-2">
                Your genealogy workspace is empty
            </h2>
            <p className="text-nox-text-muted text-sm max-w-xs leading-relaxed mb-8">
                Start a new family tree from scratch, or upload an existing{' '}
                <span className="text-nox-cobalt-light font-medium">.ged</span> file to
                visualize your genealogy instantly.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Create New Tree */}
                {showNameInput ? (
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            autoFocus
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreate();
                                if (e.key === 'Escape') { setShowNameInput(false); setProjectName(''); }
                            }}
                            placeholder="e.g. The Smith Family"
                            className="
                                bg-nox-surface border border-nox-cobalt/40 rounded-xl
                                px-4 py-2.5 text-sm text-nox-text placeholder:text-nox-text-muted
                                focus:outline-none focus:ring-2 focus:ring-nox-cobalt/50 focus:border-nox-cobalt
                                w-52 transition-all
                            "
                        />
                        <button
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="
                                px-4 py-2.5 rounded-xl bg-nox-orange text-white text-sm font-semibold
                                hover:bg-nox-orange-dark transition-colors duration-200
                                disabled:opacity-60 shadow-lg shadow-nox-orange/20
                            "
                        >
                            Create
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowNameInput(true)}
                        className="
                            flex items-center gap-2 px-5 py-2.5 rounded-xl
                            bg-nox-orange hover:bg-nox-orange-dark
                            text-white font-semibold text-sm
                            shadow-lg shadow-nox-orange/20
                            transition-all duration-200 hover:scale-105
                        "
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Create New Tree
                    </button>
                )}

                {/* Upload GEDCOM */}
                <button
                    onClick={handleUploadClick}
                    className="
                        flex items-center gap-2 px-5 py-2.5 rounded-xl
                        bg-nox-surface-light hover:bg-nox-surface-lighter
                        border border-nox-surface-lighter hover:border-nox-cobalt/40
                        text-nox-text font-medium text-sm
                        transition-all duration-200
                    "
                >
                    <svg className="w-4 h-4 text-nox-cobalt" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Upload GEDCOM
                </button>
            </div>
        </div>
    );
}
