import { useMemo, useCallback, useState } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    type NodeTypes,
    type Connection,
    type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useTreeStore } from '../../store/useTreeStore';
import type { PersonNodeData } from '../../types/api';
import { PersonNode } from './nodes/PersonNode';
import { EditPersonPanel } from './EditPersonPanel';
import { ConnectionTypeModal } from './ConnectionTypeModal';

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
    const createRelationship = useTreeStore((s) => s.createRelationship);

    // Selected node for the edit panel
    const [selectedNode, setSelectedNode] = useState<Node<PersonNodeData> | null>(null);

    // Pending connection for the type-picker modal
    const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);

    const minimapStyle = useMemo(
        () => ({
            backgroundColor: '#0f172a',
            maskColor: 'rgba(15, 23, 42, 0.7)',
        }),
        [],
    );

    /** When a node is clicked, open the edit panel */
    const handleNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node<PersonNodeData>) => {
            setSelectedNode(node);
        },
        [],
    );

    /** When the canvas background is clicked, close the edit panel */
    const handlePaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    /** When an edge is drawn between two nodes, open the type-picker */
    const handleConnect = useCallback((connection: Connection) => {
        if (connection.source && connection.target) {
            setPendingConnection(connection);
        }
    }, []);

    /** After the user picks a relationship type, persist it */
    const handleConnectionTypeSelected = useCallback(
        async (type: 'PARENT' | 'SPOUSE') => {
            if (!pendingConnection?.source || !pendingConnection?.target) return;
            setPendingConnection(null);
            await createRelationship(
                pendingConnection.source,
                pendingConnection.target,
                type,
            );
        },
        [pendingConnection, createRelationship],
    );

    return (
        <div className="w-full h-full relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                onConnect={handleConnect}
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

            {/* ── Edit Person Panel ── */}
            {selectedNode && (
                <EditPersonPanel
                    node={selectedNode}
                    onClose={() => setSelectedNode(null)}
                />
            )}

            {/* ── Connection Type Modal ── */}
            {pendingConnection && (
                <ConnectionTypeModal
                    onSelect={handleConnectionTypeSelected}
                    onCancel={() => setPendingConnection(null)}
                />
            )}
        </div>
    );
}
