import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Node } from '@xyflow/react';
import type { PersonNodeData } from '../../types/api';
import { useTreeStore } from '../../store/useTreeStore';
import { GedcomDatePicker } from '../../components/GedcomDatePicker';

/* ─── Props ──────────────────────────────────────────────────── */

interface EditPersonPanelProps {
    node: Node<PersonNodeData>;
    onClose: () => void;
}

/* ─── Component ──────────────────────────────────────────────── */

export function EditPersonPanel({ node, onClose }: EditPersonPanelProps) {
    const { t } = useTranslation();
    const updatePerson = useTreeStore((s) => s.updatePerson);
    const deletePerson = useTreeStore((s) => s.deletePerson);

    const [firstName, setFirstName] = useState(node.data.givenName ?? '');
    const [lastName, setLastName] = useState(node.data.surname ?? '');
    const [birthDate, setBirthDate] = useState(node.data.birthDate ?? '');
    const [gender, setGender] = useState<'M' | 'F' | 'U'>(node.data.sex ?? 'U');
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Re-sync form when selected node changes
    useEffect(() => {
        setFirstName(node.data.givenName ?? '');
        setLastName(node.data.surname ?? '');
        setBirthDate(node.data.birthDate ?? '');
        setGender(node.data.sex ?? 'U');
        setShowDeleteConfirm(false);
    }, [node.id, node.data.givenName, node.data.surname, node.data.birthDate, node.data.sex]);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            await updatePerson(node.id, { firstName, lastName, gender, birthDate: birthDate || undefined });
        } finally {
            setIsSaving(false);
        }
    }, [node.id, firstName, lastName, gender, birthDate, updatePerson]);

    const handleDelete = useCallback(async () => {
        setIsDeleting(true);
        try {
            await deletePerson(node.id);
            onClose();
        } finally {
            setIsDeleting(false);
        }
    }, [node.id, deletePerson, onClose]);

    const isDirty =
        firstName !== (node.data.givenName ?? '') ||
        lastName !== (node.data.surname ?? '') ||
        birthDate !== (node.data.birthDate ?? '') ||
        gender !== (node.data.sex ?? 'U');

    return (
        <div className="absolute top-0 right-0 z-40 w-[320px] h-full bg-nox-surface border-l border-nox-surface-lighter shadow-2xl flex flex-col animate-in slide-in-from-right">
            {/* ── Header ── */}
            <div className="px-4 py-3 border-b border-nox-surface-lighter bg-nox-cobalt/10">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-nox-cobalt-light uppercase tracking-wider">
                        {t('editor.title')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-nox-text-muted hover:text-nox-text transition-colors p-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <p className="text-[10px] text-nox-text-muted mt-0.5 truncate">
                    ID: {node.id}
                </p>
            </div>

            {/* ── Form ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* First Name */}
                <div>
                    <label className="text-[10px] font-semibold text-nox-text-muted uppercase tracking-wider block mb-1.5">
                        {t('editor.firstName')} *
                    </label>
                    <input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="
                            w-full bg-nox-surface-light border border-nox-surface-lighter rounded-lg
                            px-3 py-2 text-sm text-nox-text placeholder:text-nox-text-muted
                            focus:outline-none focus:ring-2 focus:ring-nox-cobalt/40 focus:border-nox-cobalt
                            transition-all
                        "
                        placeholder={t('editor.firstNamePlaceholder')}
                    />
                </div>

                {/* Last Name */}
                <div>
                    <label className="text-[10px] font-semibold text-nox-text-muted uppercase tracking-wider block mb-1.5">
                        {t('editor.lastName')}
                    </label>
                    <input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="
                            w-full bg-nox-surface-light border border-nox-surface-lighter rounded-lg
                            px-3 py-2 text-sm text-nox-text placeholder:text-nox-text-muted
                            focus:outline-none focus:ring-2 focus:ring-nox-cobalt/40 focus:border-nox-cobalt
                            transition-all
                        "
                        placeholder={t('editor.lastNamePlaceholder')}
                    />
                </div>

                {/* Gender */}
                <div>
                    <label className="text-[10px] font-semibold text-nox-text-muted uppercase tracking-wider block mb-1.5">
                        {t('editor.gender')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {([['M', '♂', 'nox-male'], ['F', '♀', 'nox-female'], ['U', '?', 'nox-unknown']] as const).map(
                            ([value, icon, color]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setGender(value)}
                                    className={`
                                        flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium
                                        border transition-all duration-150
                                        ${gender === value
                                            ? `bg-${color}/20 border-${color} text-${color}`
                                            : 'bg-nox-surface-light border-nox-surface-lighter text-nox-text-muted hover:border-nox-text-muted'
                                        }
                                    `}
                                >
                                    <span className="text-base">{icon}</span>
                                    {t(`visualizer.legend.${value === 'M' ? 'male' : value === 'F' ? 'female' : 'unknown'}`)}
                                </button>
                            ),
                        )}
                    </div>
                </div>

                {/* Birth Date */}
                <div>
                    <label className="text-[10px] font-semibold text-nox-text-muted uppercase tracking-wider block mb-1.5">
                        {t('editor.birthDate')}
                    </label>
                    <GedcomDatePicker
                        value={birthDate}
                        onChange={setBirthDate}
                        placeholder="e.g. 1 JAN 1980"
                    />
                </div>
            </div>

            {/* ── Footer Actions ── */}
            <div className="p-4 border-t border-nox-surface-lighter space-y-2">
                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={!firstName.trim() || !isDirty || isSaving}
                    className="
                        w-full py-2.5 rounded-lg text-sm font-semibold
                        bg-nox-orange hover:bg-nox-orange-dark text-white
                        shadow-lg shadow-nox-orange/20
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200
                    "
                >
                    {isSaving ? t('editor.saving') : t('editor.save')}
                </button>

                {/* Delete Section */}
                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="
                            w-full py-2 rounded-lg text-xs
                            text-nox-text-muted hover:text-nox-danger
                            border border-nox-surface-lighter hover:border-nox-danger/50
                            transition-colors duration-200
                        "
                    >
                        {t('editor.delete')}
                    </button>
                ) : (
                    <div className="p-3 rounded-lg border border-nox-danger/30 bg-nox-danger/10 space-y-2">
                        <p className="text-xs text-nox-danger font-medium">
                            {t('editor.deleteConfirm', { name: node.data.fullName || firstName })}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="
                                    flex-1 py-1.5 rounded-lg text-xs font-medium
                                    bg-nox-surface border border-nox-surface-lighter
                                    text-nox-text-muted hover:text-nox-text
                                    transition-colors
                                "
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="
                                    flex-1 py-1.5 rounded-lg text-xs font-semibold
                                    bg-nox-danger hover:bg-red-600 text-white
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    transition-colors
                                "
                            >
                                {isDeleting ? t('editor.deleting') : t('editor.confirmDelete')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
