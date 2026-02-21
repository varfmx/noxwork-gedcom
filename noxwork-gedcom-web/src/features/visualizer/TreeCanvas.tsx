import { useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useTreeStore } from '../../store/useTreeStore';
import { PersonNode } from './nodes/PersonNode';

/* ─── Node Type Registry ─────────────────────────────────────── */

const nodeTypes: NodeTypes = {
    person: PersonNode,
};

/* ─── TreeCanvas Component ───────────────────────────────────── */

export function TreeCanvas() {
    const nodes = useTreeStore((s) => s.nodes);
    const edges = useTreeStore((s) => s.edges);
    const onNodesChange = useTreeStore((s) => s.onNodesChange);
    const onEdgesChange = useTreeStore((s) => s.onEdgesChange);

    const minimapStyle = useMemo(
        () => ({
            backgroundColor: '#0f172a',
            maskColor: 'rgba(15, 23, 42, 0.7)',
        }),
        [],
    );

    return (
        <div className="w-full h-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                colorMode="dark"
                fitView
                fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
                minZoom={0.1}
                maxZoom={2}
                defaultEdgeOptions={{
                    animated: false,
                    style: { strokeWidth: 2 },
                }}
                proOptions={{ hideAttribution: true }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={24}
                    size={1}
                    color="#334155"
                />
                <Controls
                    position="bottom-left"
                    showInteractive={false}
                />
                <MiniMap
                    position="bottom-right"
                    nodeStrokeWidth={3}
                    style={minimapStyle}
                    pannable
                    zoomable
                />
            </ReactFlow>
        </div>
    );
}
