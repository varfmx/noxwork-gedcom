import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ProjectSummary } from '../../types/api';
import { useProjectStore } from '../../store/useProjectStore';
import { useTreeStore } from '../../store/useTreeStore';
import { UserAvatar } from '../../components/UserAvatar';

/* ─── Helpers ─────────────────────────────────────────────────── */

function RelativeTime({ iso }: { iso: string }) {
    const date = new Date(iso);
    const label = formatDistanceToNow(date, { addSuffix: true });
    return (
        <time
            dateTime={iso}
            title={date.toLocaleString()}
            className="text-nox-text-muted"
        >
            {label}
        </time>
    );
}

/* ─── Row action menu ─────────────────────────────────────────── */

interface ActionMenuProps {
    project: ProjectSummary;
    onRename: () => void;
}

function ActionMenu({ project, onRename }: ActionMenuProps) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { deleteProject, duplicateProject } = useProjectStore();
    const { t } = useTranslation();

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleDownload = () => {
        setOpen(false);
        // Trigger GEDCOM export (placeholder — Phase 5)
        const blob = new Blob(
            [`0 HEAD\n1 SOUR NoxworkGEDCOM\n0 TRLR`],
            { type: 'text/plain' },
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.replace(/\s+/g, '_')}.ged`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDuplicate = async () => {
        setOpen(false);
        await duplicateProject(project.id);
    };

    const handleDelete = async () => {
        setOpen(false);
        if (!window.confirm(t('dashboard.deleteConfirm', { name: project.name }))) return;
        await deleteProject(project.id);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
                className="
                    p-1.5 rounded-lg text-nox-text-muted
                    hover:text-nox-text hover:bg-nox-surface-lighter
                    transition-colors duration-150
                "
                aria-label="Project actions"
            >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                    <circle cx="8" cy="3" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="8" cy="13" r="1.5" />
                </svg>
            </button>

            {open && (
                <div className="
                    absolute right-0 mt-1 w-44 z-50
                    bg-nox-surface-light border border-nox-surface-lighter
                    rounded-xl shadow-xl overflow-hidden
                    animate-in fade-in slide-in-from-top-1 duration-150
                ">
                    {[
                        {
                            label: t('dashboard.actions.download'),
                            icon: '⬇',
                            action: handleDownload,
                            className: '',
                        },
                        {
                            label: t('dashboard.actions.duplicate'),
                            icon: '⧉',
                            action: handleDuplicate,
                            className: '',
                        },
                        {
                            label: t('dashboard.actions.rename'),
                            icon: '✎',
                            action: () => { setOpen(false); onRename(); },
                            className: '',
                        },
                        {
                            label: t('dashboard.actions.delete'),
                            icon: '✕',
                            action: handleDelete,
                            className: 'text-nox-danger hover:bg-nox-danger/10',
                        },
                    ].map(({ label, icon, action, className }) => (
                        <button
                            key={label}
                            onClick={(e) => { e.stopPropagation(); action(); }}
                            className={`
                                w-full flex items-center gap-2.5 px-3 py-2.5
                                text-sm text-nox-text hover:bg-nox-surface-lighter
                                transition-colors duration-100
                                ${className}
                            `}
                        >
                            <span className="text-base leading-none w-4 text-center">{icon}</span>
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Inline rename input ─────────────────────────────────────── */

interface InlineRenameProps {
    project: ProjectSummary;
    onDone: () => void;
}

function InlineRename({ project, onDone }: InlineRenameProps) {
    const [value, setValue] = useState(project.name);
    const { renameProject } = useProjectStore();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const submit = async () => {
        const trimmed = value.trim();
        if (trimmed && trimmed !== project.name) {
            await renameProject(project.id, trimmed);
        }
        onDone();
    };

    return (
        <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={submit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
                if (e.key === 'Escape') onDone();
            }}
            onClick={(e) => e.stopPropagation()}
            className="
                bg-nox-surface border border-nox-cobalt/60 rounded-lg
                px-2 py-0.5 text-sm text-nox-text w-full max-w-xs
                outline-none focus:ring-1 focus:ring-nox-cobalt
            "
        />
    );
}

/* ─── Main table ──────────────────────────────────────────────── */

interface ProjectTableProps {
    projects: ProjectSummary[];
    /** Full name (firstName + lastName) or email fallback for the Owner column */
    ownerDisplayName: string;
    /** Google profile photo URL from Supabase user_metadata, if available */
    ownerAvatarUrl?: string | null;
}

export function ProjectTable({ projects, ownerDisplayName, ownerAvatarUrl }: ProjectTableProps) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const setActiveProject = useProjectStore((s) => s.setActiveProject);
    const reset = useTreeStore((s) => s.reset);
    const [renamingId, setRenamingId] = useState<string | null>(null);

    const handleOpenProject = (project: ProjectSummary) => {
        if (renamingId) return;
        reset(); // clear any previous tree
        setActiveProject(project.id);
        navigate(`/visualizer/${project.id}`);
    };

    return (
        <div className="w-full rounded-xl border border-nox-surface-lighter shadow-lg overflow-visible">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-nox-surface-lighter bg-nox-surface-light">
                        {[t('dashboard.table.projectTitle'), t('dashboard.table.owner'), t('dashboard.table.nodes'), t('dashboard.table.lastModified'), ''].map((h) => (
                            <th
                                key={h}
                                className="
                                    text-left px-5 py-3.5
                                    text-[11px] font-semibold text-nox-text-muted
                                    uppercase tracking-wider whitespace-nowrap
                                "
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody className="divide-y divide-nox-surface-lighter">
                    {projects.map((project) => (
                        <tr
                            key={project.id}
                            onClick={() => handleOpenProject(project)}
                            className="
                                bg-nox-surface hover:bg-nox-surface-light
                                cursor-pointer transition-colors duration-150
                                group
                            "
                        >
                            {/* Title */}
                            <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                    {/* Icon */}
                                    <div className="w-9 h-9 rounded-lg bg-nox-cobalt/15 border border-nox-cobalt/20 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-4 h-4 text-nox-cobalt" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>

                                    {renamingId === project.id ? (
                                        <InlineRename
                                            project={project}
                                            onDone={() => setRenamingId(null)}
                                        />
                                    ) : (
                                        <div>
                                            <p className="font-medium text-nox-text group-hover:text-nox-cobalt-light transition-colors">
                                                {project.name}
                                            </p>
                                            {project.description && (
                                                <p className="text-[11px] text-nox-text-muted truncate max-w-[200px]">
                                                    {project.description}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </td>

                            {/* Owner */}
                            <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <UserAvatar
                                        avatarUrl={ownerAvatarUrl}
                                        firstName={ownerDisplayName.split(' ')[0]}
                                        email={ownerDisplayName.includes('@') ? ownerDisplayName : undefined}
                                        size="sm"
                                    />
                                    <span className="text-nox-text-muted text-xs truncate max-w-[120px]" title={ownerDisplayName}>
                                        {ownerDisplayName}
                                    </span>
                                </div>
                            </td>

                            {/* Nodes */}
                            <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-nox-text tabular-nums">{project.nodeCount}</span>
                                    {project.nodeCount > 0 && (
                                        <span className="text-nox-text-muted text-[11px]">
                                            · {project.edgeCount} {t('dashboard.table.edges')}
                                        </span>
                                    )}
                                </div>
                            </td>

                            {/* Last Modified */}
                            <td className="px-5 py-4 text-xs">
                                <RelativeTime iso={project.updatedAt} />
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                <ActionMenu
                                    project={project}
                                    onRename={() => setRenamingId(project.id)}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
