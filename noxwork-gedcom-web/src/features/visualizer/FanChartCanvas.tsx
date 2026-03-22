import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { arc as d3Arc } from 'd3-shape';
import { Tooltip } from 'react-tooltip';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useTreeStore } from '../../store/useTreeStore';
import { useThemeStore } from '../../store/useThemeStore';
import type { PersonNodeData } from '../../types/api';

/* ─── Types ──────────────────────────────────────────────────── */

/** A slot in the fan chart. Each ancestor occupies exactly one slot. */
interface FanSlot {
    /** Generation (0 = root, 1 = parents, 2 = grandparents, ...) */
    generation: number;
    /** Position index within the generation (0 to 2^gen - 1) */
    index: number;
    /** Angular start (radians) */
    startAngle: number;
    /** Angular end (radians) */
    endAngle: number;
    /** Inner radius */
    innerRadius: number;
    /** Outer radius */
    outerRadius: number;
    /** The person data (null = empty ancestor slot) */
    person: PersonNodeData | null;
    /** Person ID */
    personId: string | null;
}

interface FanChartCanvasProps {
    projectName?: string;
}

/* ─── Constants ──────────────────────────────────────────────── */

const COBALT_BLUE = '#0047AB';
const ACTION_ORANGE = '#FF8C00';

/** Inner radius for the root person circle */
const ROOT_RADIUS = 50;
/** Width of each generation ring */
const RING_WIDTH = 80;
/** Maximum generations to display */
const MAX_GENERATIONS = 7;
/** The fan spans 180° (π radians) — a semi-circle */
const FAN_SPAN = Math.PI;
/** Start angle: the fan goes from -90° to +90° (facing upward) */
const FAN_START = -Math.PI / 2;

/** Pastel generation colors — inspired by the FamilySearch reference */
const GENERATION_COLORS_DARK = [
    '#0047AB',       // Gen 0: Cobalt Blue (root)
    '#FF8C00',       // Gen 1: Action Orange (parents)
    '#2d6a4f',       // Gen 2: Deep green
    '#b5179e',       // Gen 3: Magenta
    '#3a86ff',       // Gen 4: Bright blue
    '#8338ec',       // Gen 5: Purple
    '#fb5607',       // Gen 6: Orange-red
    '#06d6a0',       // Gen 7: Teal
];

const GENERATION_COLORS_LIGHT = [
    '#bdd5ea',       // Gen 0: Light blue
    '#ffd6a5',       // Gen 1: Light orange
    '#b7e4c7',       // Gen 2: Light green
    '#f4a3c8',       // Gen 3: Light pink / rose
    '#a2d2ff',       // Gen 4: Light sky blue
    '#cdb4db',       // Gen 5: Light purple
    '#ffc971',       // Gen 6: Light gold
    '#caffbf',       // Gen 7: Light mint
];

/* ─── Component ──────────────────────────────────────────────── */

export function FanChartCanvas({ projectName }: FanChartCanvasProps) {
    const nodes = useTreeStore((s) => s.nodes);
    const edges = useTreeStore((s) => s.edges);
    const { mode } = useThemeStore();

    const [rootId, setRootId] = useState<string | null>(null);
    const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

    // Default to first node
    useEffect(() => {
        if (!rootId && nodes.length > 0) {
            // Try to find a "youngest" node — one with no children
            const childIds = new Set(
                edges.filter(e => !e.data?.isSpouse).map(e => e.target)
            );
            const leaf = nodes.find(n => childIds.has(n.id));
            setRootId(leaf?.id || nodes[0].id);
        }
    }, [nodes, edges, rootId]);

    /* ─── Build Ancestor Slots ──────────────────────────────── */

    const fanSlots = useMemo<FanSlot[]>(() => {
        if (!rootId || nodes.length === 0) return [];

        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const slots: FanSlot[] = [];

        // Build an ahnentafel (ancestor numbering) tree.
        // Position 1 = root, 2 = father, 3 = mother, 4 = paternal grandfather, etc.
        // ahnentafel number N → generation = floor(log2(N)), index within gen = N - 2^gen

        type AncestorEntry = { id: string | null; ahnNum: number };
        const queue: AncestorEntry[] = [{ id: rootId, ahnNum: 1 }];

        const visited = new Set<string>();

        while (queue.length > 0) {
            const entry = queue.shift()!;
            const { id, ahnNum } = entry;

            const generation = Math.floor(Math.log2(ahnNum));
            if (generation > MAX_GENERATIONS) continue;

            const indexInGen = ahnNum - Math.pow(2, generation);
            const slotsInGen = Math.pow(2, generation);

            // Angular span for this slot
            const slotSpan = FAN_SPAN / slotsInGen;
            const startAngle = FAN_START + indexInGen * slotSpan;
            const endAngle = startAngle + slotSpan;

            // Radii
            const innerRadius = generation === 0 ? 0 : ROOT_RADIUS + (generation - 1) * RING_WIDTH;
            const outerRadius = generation === 0 ? ROOT_RADIUS : ROOT_RADIUS + generation * RING_WIDTH;

            const node = id ? nodeMap.get(id) : null;

            slots.push({
                generation,
                index: indexInGen,
                startAngle,
                endAngle,
                innerRadius,
                outerRadius,
                person: node?.data || null,
                personId: id,
            });

            if (id && !visited.has(id)) {
                visited.add(id);

                // Find parents (edges where this person is the target / child)
                const parentEdges = edges.filter(
                    e => e.target === id && !e.data?.isSpouse
                );

                // In a fan chart, slot 2*N = father, 2*N+1 = mother
                const parents = parentEdges.map(e => e.source);

                if (generation < MAX_GENERATIONS) {
                    // Father slot (or first parent)
                    queue.push({ id: parents[0] || null, ahnNum: ahnNum * 2 });
                    // Mother slot (or second parent)
                    queue.push({ id: parents[1] || null, ahnNum: ahnNum * 2 + 1 });
                }
            } else if (generation < MAX_GENERATIONS) {
                // Empty ancestor — still add empty children slots
                queue.push({ id: null, ahnNum: ahnNum * 2 });
                queue.push({ id: null, ahnNum: ahnNum * 2 + 1 });
            }
        }

        return slots;
    }, [rootId, nodes, edges]);

    /* ─── Arc Generator ──────────────────────────────────────── */

    const arcGen = useMemo(() => {
        return d3Arc<FanSlot>()
            .startAngle(d => d.startAngle)
            .endAngle(d => d.endAngle)
            .innerRadius(d => d.innerRadius)
            .outerRadius(d => d.outerRadius)
            .padAngle(0.008)
            .cornerRadius(2);
    }, []);

    /* ─── Interaction State ─────────────────────────────────── */

    const [zoom, setZoom] = useState(0.85);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        setZoom(prev => Math.min(Math.max(prev * factor, 0.15), 4));
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current) return;
        setOffset(prev => ({
            x: prev.x + e.clientX - lastPos.current.x,
            y: prev.y + e.clientY - lastPos.current.y,
        }));
        lastPos.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    /* ─── Export ─────────────────────────────────────────────── */

    const exportImage = useCallback(async () => {
        if (!containerRef.current) return;
        const canvas = await html2canvas(containerRef.current, {
            backgroundColor: mode === 'light' ? '#f8fafc' : '#0f172a',
            scale: 2,
        });
        const link = document.createElement('a');
        link.download = `${projectName || 'family-tree'}-fan-chart.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }, [mode, projectName]);

    const exportPDF = useCallback(async () => {
        if (!containerRef.current) return;
        const canvas = await html2canvas(containerRef.current, {
            backgroundColor: '#ffffff',
            scale: 2,
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = (imgProps.height * pdfW) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
        pdf.save(`${projectName || 'family-tree'}-fan-chart.pdf`);
    }, [projectName]);

    /* ─── Helper: Text position and rotation ─────────────────── */

    function getTextTransform(slot: FanSlot): string {
        const midAngle = (slot.startAngle + slot.endAngle) / 2;
        const midRadius = (slot.innerRadius + slot.outerRadius) / 2;
        const x = Math.cos(midAngle) * midRadius;
        const y = Math.sin(midAngle) * midRadius;

        // Convert angle to degrees for rotation
        let rotDeg = (midAngle * 180) / Math.PI;

        // Keep text readable (not upside-down)
        if (rotDeg > 90) rotDeg -= 180;
        if (rotDeg < -90) rotDeg += 180;

        return `translate(${x},${y}) rotate(${rotDeg})`;
    }

    /** Truncate text to fit inside a wedge */
    function truncateName(name: string, generation: number): string {
        const maxLen = generation <= 2 ? 20 : generation <= 4 ? 14 : 10;
        if (name.length <= maxLen) return name;
        return name.slice(0, maxLen - 1) + '…';
    }

    /** Font size decreases with each generation */
    function getFontSize(generation: number): number {
        if (generation === 0) return 11;
        if (generation === 1) return 10;
        if (generation === 2) return 9;
        if (generation === 3) return 8;
        if (generation === 4) return 7;
        return 6;
    }

    const genColors = mode === 'light' ? GENERATION_COLORS_LIGHT : GENERATION_COLORS_DARK;

    /* ─── Determine how many generations actually have data ─── */

    const maxGenWithData = useMemo(() => {
        let max = 0;
        for (const slot of fanSlots) {
            if (slot.person && slot.generation > max) max = slot.generation;
        }
        return max;
    }, [fanSlots]);

    /** Only render slots up to maxGenWithData + 1 (to show empty slots for the next generation) */
    const visibleSlots = useMemo(() => {
        const limit = Math.min(maxGenWithData + 1, MAX_GENERATIONS);
        return fanSlots.filter(s => s.generation <= limit);
    }, [fanSlots, maxGenWithData]);

    /* ─── Total chart radius for viewBox ─────────────────────── */

    const totalRadius = ROOT_RADIUS + maxGenWithData * RING_WIDTH + RING_WIDTH;

    if (!rootId) {
        return (
            <div className="w-full h-full flex items-center justify-center text-nox-text-muted">
                Loading chart…
            </div>
        );
    }

    return (
        <div className="w-full h-full relative overflow-hidden bg-nox-surface" onWheel={handleWheel}>
            {/* ── Action Bar ── */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <div className="flex gap-2">
                    <button
                        onClick={exportImage}
                        className="px-3 py-1.5 bg-nox-surface-light border border-nox-surface-lighter rounded-lg text-xs font-medium text-nox-text hover:bg-nox-surface-lighter transition-colors flex items-center gap-2"
                    >
                        <svg className="w-3.5 h-3.5 text-nox-cobalt-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Save as Image
                    </button>
                    <button
                        onClick={exportPDF}
                        className="px-3 py-1.5 bg-nox-surface-light border border-nox-surface-lighter rounded-lg text-xs font-medium text-nox-text hover:bg-nox-surface-lighter transition-colors flex items-center gap-2"
                    >
                        <svg className="w-3.5 h-3.5 text-nox-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Save as PDF
                    </button>
                </div>

                {/* Root Selector */}
                <select
                    value={rootId}
                    onChange={(e) => { setRootId(e.target.value); setOffset({ x: 0, y: 0 }); setZoom(0.85); }}
                    className="bg-nox-surface-light border border-nox-surface-lighter rounded-lg text-[11px] px-2 py-1.5 text-nox-text-muted outline-none focus:border-nox-cobalt/50"
                >
                    {nodes.map(n => (
                        <option key={n.id} value={n.id}>{n.data.fullName || n.id}</option>
                    ))}
                </select>
            </div>

            {/* ── Zoom Indicator ── */}
            <div className="absolute bottom-4 right-4 z-10 px-3 py-1 bg-nox-surface-light/80 border border-nox-surface-lighter rounded-full text-[10px] font-mono text-nox-text-muted backdrop-blur-sm">
                {Math.round(zoom * 100)}%
            </div>

            {/* ── SVG Canvas ── */}
            <div
                ref={containerRef}
                className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleMouseDown}
            >
                <svg
                    ref={svgRef}
                    className="w-full h-full"
                    viewBox={`${-totalRadius - 40} ${-totalRadius - 40} ${(totalRadius + 40) * 2} ${(totalRadius + 40) * 2}`}
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                        transformOrigin: 'center center',
                    }}
                >
                    {/* ── Generation Rings (background) ── */}
                    {Array.from({ length: maxGenWithData + 1 }, (_, gen) => {
                        if (gen === 0) return null;
                        const inner = ROOT_RADIUS + (gen - 1) * RING_WIDTH;
                        const outer = ROOT_RADIUS + gen * RING_WIDTH;
                        const mid = (inner + outer) / 2;
                        return (
                            <circle
                                key={`ring-${gen}`}
                                cx={0}
                                cy={0}
                                r={mid}
                                fill="none"
                                stroke={mode === 'light' ? '#e2e8f0' : '#1e293b'}
                                strokeWidth={outer - inner}
                                strokeDasharray={`${mid * Math.PI} ${mid * Math.PI}`}
                                transform="rotate(-90)"
                                opacity={0.3}
                            />
                        );
                    })}

                    {/* ── Ancestor Wedges ── */}
                    {visibleSlots.map((slot) => {
                        const key = `${slot.generation}-${slot.index}`;

                        // Skip root circle (drawn separately)
                        if (slot.generation === 0) return null;

                        const path = arcGen(slot);
                        if (!path) return null;

                        const isEmpty = !slot.person;
                        const isHovered = hoveredSlot === key;
                        const fillColor = isEmpty
                            ? (mode === 'light' ? '#f1f5f9' : '#1a2332')
                            : genColors[slot.generation % genColors.length];

                        return (
                            <g
                                key={key}
                                onMouseEnter={() => !isEmpty && setHoveredSlot(key)}
                                onMouseLeave={() => setHoveredSlot(null)}
                                data-tooltip-id={isEmpty ? undefined : 'fan-person-tooltip'}
                                data-tooltip-content={isEmpty ? undefined : JSON.stringify(slot.person)}
                                className={isEmpty ? '' : 'cursor-pointer'}
                            >
                                <path
                                    d={path}
                                    fill={isHovered ? ACTION_ORANGE : fillColor}
                                    stroke={COBALT_BLUE}
                                    strokeWidth={0.8}
                                    opacity={isEmpty ? 0.35 : (isHovered ? 1 : 0.85)}
                                    className="transition-all duration-150"
                                />

                                {/* Person name + dates */}
                                {slot.person && (
                                    <text
                                        transform={getTextTransform(slot)}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        pointerEvents="none"
                                        fontSize={getFontSize(slot.generation)}
                                        fontWeight={slot.generation <= 2 ? 600 : 500}
                                        fill={
                                            isHovered
                                                ? '#ffffff'
                                                : mode === 'light'
                                                    ? '#1e293b'
                                                    : '#e2e8f0'
                                        }
                                        className="transition-colors duration-150"
                                    >
                                        <tspan x="0" dy="-0.4em">
                                            {truncateName(slot.person.fullName || 'Unknown', slot.generation)}
                                        </tspan>
                                        {slot.person.birthDate && slot.generation <= 5 && (
                                            <tspan
                                                x="0"
                                                dy="1.2em"
                                                fontSize={Math.max(getFontSize(slot.generation) - 1.5, 4)}
                                                opacity={0.7}
                                            >
                                                {slot.person.birthDate}
                                            </tspan>
                                        )}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* ── Root Person Circle ── */}
                    {(() => {
                        const rootSlot = visibleSlots.find(s => s.generation === 0);
                        if (!rootSlot?.person) return null;
                        const isHovered = hoveredSlot === '0-0';
                        return (
                            <g
                                onMouseEnter={() => setHoveredSlot('0-0')}
                                onMouseLeave={() => setHoveredSlot(null)}
                                data-tooltip-id="fan-person-tooltip"
                                data-tooltip-content={JSON.stringify(rootSlot.person)}
                                className="cursor-pointer"
                            >
                                {/* Outer glow */}
                                <circle
                                    cx={0} cy={0} r={ROOT_RADIUS + 3}
                                    fill="none"
                                    stroke={ACTION_ORANGE}
                                    strokeWidth={2}
                                    opacity={isHovered ? 1 : 0.4}
                                    className="transition-opacity duration-200"
                                />
                                {/* Main circle */}
                                <circle
                                    cx={0} cy={0} r={ROOT_RADIUS}
                                    fill={isHovered ? ACTION_ORANGE : COBALT_BLUE}
                                    className="transition-colors duration-200"
                                />
                                {/* Name */}
                                <text
                                    x={0} y={-6}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize={11}
                                    fontWeight={700}
                                    fill="#ffffff"
                                    pointerEvents="none"
                                >
                                    {truncateName(rootSlot.person.fullName || 'Unknown', 0)}
                                </text>
                                {rootSlot.person.birthDate && (
                                    <text
                                        x={0} y={10}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fontSize={8}
                                        fill="#ffffff"
                                        opacity={0.75}
                                        pointerEvents="none"
                                    >
                                        {rootSlot.person.birthDate}
                                    </text>
                                )}
                            </g>
                        );
                    })()}
                </svg>
            </div>

            {/* ── Tooltip ── */}
            <Tooltip
                id="fan-person-tooltip"
                render={({ content }) => {
                    if (!content) return null;
                    let data: PersonNodeData;
                    try { data = JSON.parse(content); } catch { return null; }
                    return (
                        <div className="flex flex-col gap-2 p-1 min-w-[220px]">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-11 h-11 rounded-full flex items-center justify-center border-2"
                                    style={{
                                        borderColor: ACTION_ORANGE,
                                        backgroundColor: mode === 'light' ? '#fff7ed' : '#1e293b',
                                    }}
                                >
                                    <span className="text-lg">
                                        {data.sex === 'M' ? '👨' : data.sex === 'F' ? '👩' : '👤'}
                                    </span>
                                </div>
                                <div>
                                    <div className="text-sm font-bold" style={{ color: ACTION_ORANGE }}>
                                        {data.fullName}
                                    </div>
                                    <div className="text-[10px] text-nox-text-muted">
                                        ID: {data.gedcomId}
                                    </div>
                                </div>
                            </div>
                            <div className="h-px bg-nox-surface-lighter" />
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                <span className="text-nox-text-muted">Gender:</span>
                                <span className="text-nox-text font-medium">
                                    {data.sex === 'M' ? 'Male' : data.sex === 'F' ? 'Female' : 'Unknown'}
                                </span>
                                <span className="text-nox-text-muted">Birth:</span>
                                <span className="text-nox-text font-medium">
                                    {data.birthDate || 'N/A'}
                                </span>
                                {data.deathDate && (
                                    <>
                                        <span className="text-nox-text-muted">Death:</span>
                                        <span className="text-nox-text font-medium">
                                            {data.deathDate}
                                        </span>
                                    </>
                                )}
                                {data.birthPlace && (
                                    <>
                                        <span className="text-nox-text-muted">Place:</span>
                                        <span className="text-nox-text font-medium">
                                            {data.birthPlace}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                }}
                style={{
                    backgroundColor: mode === 'light' ? '#ffffff' : '#1e293b',
                    border: `1.5px solid ${ACTION_ORANGE}`,
                    color: mode === 'light' ? '#0f172a' : '#f1f5f9',
                    padding: '12px',
                    borderRadius: '14px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    opacity: 1,
                }}
                className="!opacity-100"
            />
        </div>
    );
}
