import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useReactFlow } from '@xyflow/react';
import {
    exportAsPng,
    exportAsPdf,
    type ExportFormat,
} from '../../services/ExportService';

/* ─── ExportButton ──────────────────────────────────────────── */

interface ExportButtonProps {
    /** Project name used as the file name for exports */
    projectName?: string;
}

export function ExportButton({ projectName }: ExportButtonProps) {
    const { t } = useTranslation();
    const reactFlow = useReactFlow();

    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleExport = useCallback(
        async (format: ExportFormat) => {
            setIsOpen(false);
            setIsExporting(true);
            setProgress(0);

            try {
                // Fit the entire tree into view before capturing
                reactFlow.fitView({ padding: 0.15, duration: 300 });

                // Wait for the fitView animation to settle
                await new Promise((r) => setTimeout(r, 400));

                // Get the React Flow wrapper element
                const wrapper = document.querySelector<HTMLElement>(
                    '.react-flow',
                );
                if (!wrapper) {
                    throw new Error('React Flow element not found');
                }

                const fileName =
                    projectName?.replace(/\s+/g, '_') ?? 'family-tree';

                const exportFn =
                    format === 'pdf' ? exportAsPdf : exportAsPng;

                await exportFn(wrapper, {
                    fileName,
                    scale: 2,
                    onProgress: setProgress,
                });
            } catch (err) {
                console.error('Export failed:', err);
            } finally {
                // Brief delay so the user sees 100%
                setTimeout(() => {
                    setIsExporting(false);
                    setProgress(0);
                }, 600);
            }
        },
        [reactFlow, projectName],
    );

    return (
        <>
            {/* ── Download Button + Dropdown ── */}
            <div className="relative" ref={dropdownRef}>
                <button
                    id="export-download-btn"
                    onClick={() => setIsOpen((prev) => !prev)}
                    className="
                        flex items-center gap-1.5
                        px-3 py-1.5 rounded-lg text-xs font-medium
                        bg-nox-orange/15 border border-nox-orange/30
                        text-nox-orange hover:bg-nox-orange/25
                        transition-all duration-200
                    "
                >
                    {/* Download icon */}
                    <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                        />
                    </svg>
                    {t('export.download')}
                    {/* Chevron */}
                    <svg
                        className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                    </svg>
                </button>

                {/* Dropdown */}
                {isOpen && (
                    <div
                        className="
                            absolute right-0 mt-1.5 z-50
                            w-44 py-1
                            bg-nox-surface-light
                            border border-nox-surface-lighter
                            rounded-xl shadow-xl shadow-black/30
                            animate-in fade-in slide-in-from-top-1
                        "
                    >
                        <button
                            id="export-png-btn"
                            onClick={() => handleExport('png')}
                            className="
                                w-full flex items-center gap-2.5 px-3 py-2
                                text-xs text-nox-text hover:bg-nox-surface-lighter
                                transition-colors duration-150
                            "
                        >
                            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-nox-cobalt/15 text-nox-cobalt-light text-[10px] font-bold">
                                PNG
                            </span>
                            <div className="text-left">
                                <p className="font-medium">
                                    {t('export.pngLabel')}
                                </p>
                                <p className="text-[10px] text-nox-text-muted">
                                    {t('export.pngHint')}
                                </p>
                            </div>
                        </button>
                        <button
                            id="export-pdf-btn"
                            onClick={() => handleExport('pdf')}
                            className="
                                w-full flex items-center gap-2.5 px-3 py-2
                                text-xs text-nox-text hover:bg-nox-surface-lighter
                                transition-colors duration-150
                            "
                        >
                            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-red-500/15 text-red-400 text-[10px] font-bold">
                                PDF
                            </span>
                            <div className="text-left">
                                <p className="font-medium">
                                    {t('export.pdfLabel')}
                                </p>
                                <p className="text-[10px] text-nox-text-muted">
                                    {t('export.pdfHint')}
                                </p>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* ── Progress Overlay ── */}
            {isExporting && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-nox-surface/80 backdrop-blur-sm">
                    <div className="bg-nox-surface-light border border-nox-surface-lighter rounded-2xl shadow-2xl p-8 w-[340px] text-center space-y-5">
                        {/* Spinner */}
                        <div className="mx-auto w-12 h-12 border-[3px] border-nox-orange/25 border-t-nox-orange rounded-full animate-spin" />

                        {/* Label */}
                        <div>
                            <p className="text-sm font-semibold text-nox-text">
                                {t('export.generating')}
                            </p>
                            <p className="text-xs text-nox-text-muted mt-1">
                                {t('export.generatingHint')}
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-nox-surface rounded-full h-2.5 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-300 ease-out"
                                style={{
                                    width: `${progress}%`,
                                    background:
                                        'linear-gradient(90deg, #FF8C00, #ffaa40)',
                                }}
                            />
                        </div>

                        {/* Percentage */}
                        <p className="text-xs text-nox-orange font-mono font-bold">
                            {progress}%
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
