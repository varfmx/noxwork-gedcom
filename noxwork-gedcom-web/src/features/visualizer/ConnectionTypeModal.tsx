import { useTranslation } from 'react-i18next';

interface ConnectionTypeModalProps {
    onSelect: (type: 'PARENT' | 'SPOUSE') => void;
    onCancel: () => void;
}

/**
 * ConnectionTypeModal — Appears when the user draws an edge between two nodes.
 * Asks whether the relationship is Parent→Child or Spouse.
 */
export function ConnectionTypeModal({ onSelect, onCancel }: ConnectionTypeModalProps) {
    const { t } = useTranslation();

    return (
        <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onCancel}
        >
            <div
                className="bg-nox-surface-light border border-nox-surface-lighter rounded-2xl shadow-2xl w-72 p-5"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-sm font-bold text-nox-cobalt-light uppercase tracking-wider mb-1">
                    {t('editor.connectionType')}
                </h3>
                <p className="text-[11px] text-nox-text-muted mb-4">
                    {t('editor.connectionTypeHint')}
                </p>

                <div className="space-y-2">
                    <button
                        onClick={() => onSelect('PARENT')}
                        className="
                            w-full flex items-center gap-3 px-4 py-3 rounded-xl
                            bg-nox-surface border border-nox-surface-lighter
                            hover:border-nox-cobalt hover:bg-nox-cobalt/10
                            transition-all duration-150 text-left
                        "
                    >
                        <div className="w-8 h-0.5 bg-nox-cobalt flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-nox-text">
                                {t('visualizer.legend.parentChild')}
                            </p>
                            <p className="text-[10px] text-nox-text-muted">
                                {t('editor.parentChildDesc')}
                            </p>
                        </div>
                    </button>

                    <button
                        onClick={() => onSelect('SPOUSE')}
                        className="
                            w-full flex items-center gap-3 px-4 py-3 rounded-xl
                            bg-nox-surface border border-nox-surface-lighter
                            hover:border-nox-orange hover:bg-nox-orange/10
                            transition-all duration-150 text-left
                        "
                    >
                        <div className="w-8 h-0.5 border-t-2 border-dashed border-nox-orange flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-nox-text">
                                {t('visualizer.legend.spouse')}
                            </p>
                            <p className="text-[10px] text-nox-text-muted">
                                {t('editor.spouseDesc')}
                            </p>
                        </div>
                    </button>
                </div>

                <button
                    onClick={onCancel}
                    className="
                        w-full mt-3 py-2 rounded-lg text-xs
                        text-nox-text-muted hover:text-nox-text
                        border border-nox-surface-lighter hover:border-nox-text-muted
                        transition-colors duration-200
                    "
                >
                    {t('common.cancel')}
                </button>
            </div>
        </div>
    );
}
