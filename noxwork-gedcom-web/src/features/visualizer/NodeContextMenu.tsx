import { useTranslation } from 'react-i18next';
import { useState } from 'react';

/* ─── Props ──────────────────────────────────────────────────── */

interface NodeContextMenuProps {
    /** Screen position to anchor the menu */
    x: number;
    y: number;
    /** The node this menu is acting on */
    nodeId: string;
    nodeName: string;
    /** Callbacks */
    onAddChild: () => void;
    onAddSpouse: () => void;
    onAddParent: () => void;
    onDelete: () => void;
    onClose: () => void;
}

/* ─── Component ──────────────────────────────────────────────── */

export function NodeContextMenu({
    x,
    y,
    nodeName,
    onAddChild,
    onAddSpouse,
    onAddParent,
    onDelete,
    onClose,
}: NodeContextMenuProps) {
    const { t } = useTranslation();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    return (
        <>
            {/* Invisible backdrop to close on click-away */}
            <div
                className="fixed inset-0 z-[60]"
                onClick={onClose}
                onContextMenu={(e) => { e.preventDefault(); onClose(); }}
            />

            {/* Context Menu */}
            <div
                className="
                    fixed z-[61]
                    bg-nox-surface-light/95 backdrop-blur-md
                    border border-nox-surface-lighter
                    rounded-xl shadow-2xl
                    min-w-[200px]
                    py-1.5
                    animate-in fade-in zoom-in-95
                    origin-top-left
                "
                style={{ left: x, top: y }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with node name */}
                <div className="px-3 py-1.5 border-b border-nox-surface-lighter mb-1">
                    <p className="text-[10px] text-nox-text-muted uppercase tracking-wider font-semibold truncate max-w-[180px]">
                        {nodeName || 'Unknown'}
                    </p>
                </div>

                {/* Add Child */}
                <button
                    onClick={() => { onAddChild(); onClose(); }}
                    className="
                        w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs
                        text-nox-text hover:bg-nox-cobalt/15 hover:text-nox-cobalt-light
                        transition-colors duration-100
                    "
                >
                    <svg className="w-3.5 h-3.5 text-nox-cobalt-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                    </svg>
                    {t('contextMenu.addChild')}
                </button>

                {/* Add Spouse */}
                <button
                    onClick={() => { onAddSpouse(); onClose(); }}
                    className="
                        w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs
                        text-nox-text hover:bg-nox-orange/15 hover:text-nox-orange
                        transition-colors duration-100
                    "
                >
                    <svg className="w-3.5 h-3.5 text-nox-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                    {t('contextMenu.addSpouse')}
                </button>

                {/* Add Parent */}
                <button
                    onClick={() => { onAddParent(); onClose(); }}
                    className="
                        w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs
                        text-nox-text hover:bg-nox-cobalt/15 hover:text-nox-cobalt-light
                        transition-colors duration-100
                    "
                >
                    <svg className="w-3.5 h-3.5 text-nox-cobalt-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                    </svg>
                    {t('contextMenu.addParent')}
                </button>

                {/* Divider */}
                <div className="my-1 border-t border-nox-surface-lighter" />

                {/* Delete */}
                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="
                            w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs
                            text-nox-text-muted hover:bg-nox-danger/15 hover:text-nox-danger
                            transition-colors duration-100
                        "
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        {t('contextMenu.delete')}
                        <span className="ml-auto text-[10px] text-nox-text-muted opacity-60">Del</span>
                    </button>
                ) : (
                    <div className="px-2.5 py-2 space-y-2">
                        <p className="text-[10px] text-nox-danger font-medium px-1">
                            {t('editor.deleteConfirm', { name: nodeName })}
                        </p>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-1.5 rounded-lg text-[10px] font-medium bg-nox-surface border border-nox-surface-lighter text-nox-text-muted hover:text-nox-text transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={() => { onDelete(); onClose(); }}
                                className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold bg-nox-danger hover:bg-red-600 text-white transition-colors"
                            >
                                {t('editor.confirmDelete')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
