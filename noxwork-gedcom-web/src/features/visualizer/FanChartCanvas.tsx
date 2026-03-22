import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3-hierarchy';
import { arc as d3Arc } from 'd3-shape';
import { Tooltip } from 'react-tooltip';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useTreeStore } from '../../store/useTreeStore';
import { useThemeStore } from '../../store/useThemeStore';
import type { PersonNodeData } from '../../types/api';

/* ─── Types ──────────────────────────────────────────────────── */

interface FanChartNode extends d3.HierarchyNode<HierarchyData> {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

interface HierarchyData {
    id: string;
    name: string;
    data: PersonNodeData;
    children?: HierarchyData[];
}

interface FanChartCanvasProps {
    projectName?: string;
}

/* ─── Constants ──────────────────────────────────────────────── */

const COBALT_BLUE = '#0047AB';
const ACTION_ORANGE = '#FF8C00';
const RADIUS_STEP = 120; // Width of each generation ring

export function FanChartCanvas({ projectName }: FanChartCanvasProps) {
    const nodes = useTreeStore((s) => s.nodes);
    const edges = useTreeStore((s) => s.edges);
    const { mode } = useThemeStore();

    // ── Root Selection ──
    // Default to the first node if none selected, or a node with no children if it's an ancestor chart.
    const [rootId, setRootId] = useState<string | null>(null);

    // If no root is set, try to find a reasonable default
    useEffect(() => {
        if (!rootId && nodes.length > 0) {
            // Find a node that has parents but no children? No, usually start from someone "young".
            // For now, just pick the first one or one with no children.
            const nodeWithNoChildren = nodes.find(n => !edges.some(e => e.source === n.id && !e.data?.isSpouse));
            setRootId(nodeWithNoChildren?.id || nodes[0].id);
        }
    }, [nodes, edges, rootId]);

    // ── Hierarchy Data Preparation (Ancestors) ──
    const hierarchyData = useMemo<HierarchyData | null>(() => {
        if (!rootId || nodes.length === 0) return null;

        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        const buildAncestors = (currentId: string, depth = 0): HierarchyData | null => {
            const node = nodeMap.get(currentId);
            if (!node || depth > 6) return null; // Limit depth for performance/readability

            // Find parents
            const parentEdges = edges.filter(e => e.target === currentId && !e.data?.isSpouse);
            const children: HierarchyData[] = [];

            for (const edge of parentEdges) {
                const parentNode = buildAncestors(edge.source, depth + 1);
                if (parentNode) children.push(parentNode);
            }

            return {
                id: node.id,
                name: node.data.fullName || 'Unknown',
                data: node.data,
                children: children.length > 0 ? children : undefined
            };
        };

        return buildAncestors(rootId);
    }, [rootId, nodes, edges]);

    // ── D3 Partition Layout ──
    const fanNodes = useMemo(() => {
        if (!hierarchyData) return [];

        const root = d3.hierarchy(hierarchyData)
            .sum(() => 1) // Equal weight for each leaf
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        const partition = d3.partition<HierarchyData>()
            .size([Math.PI, 6 * RADIUS_STEP]); // size: [angular range, radial range]

        const rootLayout = partition(root) as FanChartNode;

        return rootLayout.descendants();
    }, [hierarchyData]);

    // ── Arc Generator ──
    const arcGenerator = d3Arc<FanChartNode>()
        .startAngle(d => d.x0 - Math.PI / 2) // Rotate so it faces up or right
        .endAngle(d => d.x1 - Math.PI / 2)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1)
        .cornerRadius(2)
        .padAngle(0.005);

    // ── Interaction State ──
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.min(Math.max(prev * delta, 0.1), 5));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
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

    // ── Export Handlers ──
    const exportImage = async () => {
        if (!containerRef.current) return;
        const canvas = await html2canvas(containerRef.current, {
            backgroundColor: mode === 'light' ? '#f8fafc' : '#0f172a',
            scale: 2
        });
        const link = document.createElement('a');
        link.download = `${projectName || 'family-tree'}-fan-chart.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const exportPDF = async () => {
        if (!containerRef.current) return;
        const canvas = await html2canvas(containerRef.current, {
            backgroundColor: '#ffffff',
            scale: 2
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${projectName || 'family-tree'}-fan-chart.pdf`);
    };

    if (!rootId) return <div className="p-8 text-nox-text-muted">Loading chart...</div>;

    return (
        <div className="w-full h-full relative overflow-hidden bg-nox-surface" onWheel={handleWheel}>
            {/* Header / Actions */}
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
                
                {/* Root Selector Dropdown (Simplified) */}
                <select 
                    value={rootId} 
                    onChange={(e) => setRootId(e.target.value)}
                    className="bg-nox-surface-light border border-nox-surface-lighter rounded-lg text-[11px] px-2 py-1 text-nox-text-muted outline-none focus:border-nox-cobalt/50"
                >
                    {nodes.slice(0, 50).map(n => (
                        <option key={n.id} value={n.id}>{n.data.fullName || n.id}</option>
                    ))}
                </select>
            </div>

            {/* Canvas Area */}
            <div 
                ref={containerRef}
                className="w-full h-full cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
            >
                <div 
                    className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
                    style={{ 
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                        transformOrigin: 'center'
                    }}
                >
                    <svg 
                        width="1000" 
                        height="1000" 
                        viewBox="-500 -500 1000 1000"
                        className="overflow-visible"
                    >
                        {fanNodes.map((node, i) => {
                            const arcPath = arcGenerator(node);
                            if (!arcPath) return null;
                            
                            const isRoot = node.depth === 0;
                            
                            return (
                                <g 
                                    key={node.data.id + '-' + i}
                                    className="group cursor-help"
                                    data-tooltip-id="person-tooltip"
                                    data-tooltip-content={JSON.stringify(node.data.data)}
                                >
                                    <path
                                        d={arcPath}
                                        fill={isRoot ? COBALT_BLUE : 'transparent'}
                                        stroke={COBALT_BLUE}
                                        strokeWidth="0.5"
                                        className="transition-all duration-200 group-hover:fill-nox-orange/20"
                                        style={{
                                            fill: isRoot ? COBALT_BLUE : (mode === 'light' ? '#fff' : '#1e293b'),
                                            stroke: COBALT_BLUE
                                        }}
                                    />
                                    
                                    {/* Text Label */}
                                    <text
                                        transform={(() => {
                                            const angle = (node.x0 + node.x1) / 2 - Math.PI / 2;
                                            const radius = (node.y0 + node.y1) / 2;
                                            const x = Math.cos(angle) * radius;
                                            const y = Math.sin(angle) * radius;
                                            // Rotation: text should be readable
                                            const rotation = (angle * 180) / Math.PI;
                                            const finalRotation = rotation > 90 || rotation < -90 ? rotation + 180 : rotation;
                                            return `translate(${x}, ${y}) rotate(${finalRotation})`;
                                        })()}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        pointerEvents="none"
                                        className="text-[8px] font-medium transition-colors"
                                        fill={isRoot ? '#fff' : (mode === 'light' ? '#0f172a' : '#94a3b8')}
                                    >
                                        {node.data.name.split(' ')[0]}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>

            {/* Custom Tooltip */}
            <Tooltip 
                id="person-tooltip" 
                render={({ content }) => {
                    if (!content) return null;
                    const data = JSON.parse(content) as PersonNodeData;
                    return (
                        <div className="flex flex-col gap-2 p-1 min-w-[200px]">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-nox-surface flex items-center justify-center border" style={{ borderColor: ACTION_ORANGE }}>
                                    <span className="text-xl">{data.sex === 'M' ? '👨' : data.sex === 'F' ? '👩' : '👤'}</span>
                                </div>
                                <div>
                                    <div className="text-sm font-bold" style={{ color: ACTION_ORANGE }}>{data.fullName}</div>
                                    <div className="text-[10px] text-nox-text-muted">ID: {data.gedcomId}</div>
                                </div>
                            </div>
                            <div className="h-px bg-nox-surface-lighter my-1" />
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                <span className="text-nox-text-muted">Gender:</span>
                                <span className="text-nox-text">{data.sex === 'M' ? 'Male' : data.sex === 'F' ? 'Female' : 'Unknown'}</span>
                                <span className="text-nox-text-muted">Birth:</span>
                                <span className="text-nox-text">{data.birthDate || 'N/A'}</span>
                            </div>
                        </div>
                    );
                }}
                className="!bg-nox-surface-light !border !border-nox-orange !opacity-100 !shadow-2xl !p-3 !rounded-xl !z-50"
            />
        </div>
    );
}
