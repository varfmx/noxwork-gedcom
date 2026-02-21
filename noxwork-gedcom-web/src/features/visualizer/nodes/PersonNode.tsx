import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { PersonNodeData } from '../../../types/api';

/* ─── Gender Color Map ───────────────────────────────────────── */

const GENDER_STYLES = {
    M: {
        borderColor: 'border-nox-male',
        glowColor: 'shadow-nox-male/20',
        label: '♂',
    },
    F: {
        borderColor: 'border-nox-female',
        glowColor: 'shadow-nox-female/20',
        label: '♀',
    },
    U: {
        borderColor: 'border-nox-unknown',
        glowColor: 'shadow-nox-unknown/20',
        label: '?',
    },
} as const;

/* ─── PersonNode Component ───────────────────────────────────── */

function PersonNodeComponent({ data }: NodeProps) {
    const nodeData = data as unknown as PersonNodeData;
    const gender = GENDER_STYLES[nodeData.sex] ?? GENDER_STYLES.U;
    const hasMultipleRoles = nodeData.detectedRoles.length > 1;
    const roleCount = nodeData.detectedRoles.length;

    const formatDate = (date: string | null): string => {
        if (!date) return '—';
        return date;
    };

    return (
        <>
            {/* Incoming connections (from parents) */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-2 !h-2 !bg-nox-cobalt !border-nox-surface"
            />

            <div
                className={`
          relative
          min-w-[220px] max-w-[280px]
          bg-nox-surface-light
          rounded-lg
          border-l-4 ${gender.borderColor}
          border border-nox-surface-lighter
          shadow-lg ${gender.glowColor}
          hover:shadow-xl hover:border-nox-cobalt-light
          transition-all duration-200
          cursor-grab active:cursor-grabbing
        `}
            >
                {/* Multi-Role Badge */}
                {hasMultipleRoles && (
                    <div
                        className="
              absolute -top-2.5 -right-2.5
              flex items-center gap-1
              bg-nox-warning text-nox-surface
              text-[10px] font-bold
              px-1.5 py-0.5
              rounded-full
              shadow-md
              ring-2 ring-nox-surface
              z-10
            "
                        title={nodeData.detectedRoles
                            .map((r) => `${r.type} (${r.degree}°)`)
                            .join(', ')}
                    >
                        ⚠ {roleCount}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                    <span className="text-lg opacity-60">{gender.label}</span>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-nox-text truncate">
                            {nodeData.fullName || 'Unknown'}
                        </h3>
                        <p className="text-[10px] text-nox-text-muted font-mono truncate">
                            {nodeData.gedcomId}
                        </p>
                    </div>
                </div>

                {/* Dates */}
                <div className="px-3 pb-3 pt-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs text-nox-text-muted">
                        <span className="text-green-400">★</span>
                        <span>{formatDate(nodeData.birthDate)}</span>
                        {nodeData.birthPlace && (
                            <span className="truncate text-[10px] opacity-60">
                                · {nodeData.birthPlace}
                            </span>
                        )}
                    </div>
                    {nodeData.deathDate && (
                        <div className="flex items-center gap-1.5 text-xs text-nox-text-muted">
                            <span className="text-red-400">✝</span>
                            <span>{formatDate(nodeData.deathDate)}</span>
                        </div>
                    )}
                </div>

                {/* Detected Roles (collapsed list) */}
                {nodeData.detectedRoles.length > 0 && (
                    <div className="border-t border-nox-surface-lighter px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                            {nodeData.detectedRoles.slice(0, 3).map((role, i) => (
                                <span
                                    key={i}
                                    className={`
                    inline-block text-[9px] font-medium px-1.5 py-0.5 rounded
                    ${hasMultipleRoles
                                            ? 'bg-nox-warning/15 text-nox-warning'
                                            : 'bg-nox-cobalt/15 text-nox-cobalt-light'
                                        }
                  `}
                                >
                                    {role.type}
                                </span>
                            ))}
                            {nodeData.detectedRoles.length > 3 && (
                                <span className="text-[9px] text-nox-text-muted">
                                    +{nodeData.detectedRoles.length - 3} more
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Outgoing connections (to children) */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-2 !h-2 !bg-nox-orange !border-nox-surface"
            />
        </>
    );
}

export const PersonNode = memo(PersonNodeComponent);
