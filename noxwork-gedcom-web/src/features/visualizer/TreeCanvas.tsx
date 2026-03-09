import { useMemo, useCallback, useState, useEffect } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    Controls,
    MiniMap,
    Panel,
    BackgroundVariant,
    useReactFlow,
    type NodeTypes,
    type Connection,
    type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useTreeStore } from '../../store/useTreeStore';
import { useThemeStore } from '../../store/useThemeStore';
import type { PersonNodeData } from '../../types/api';
import { PersonNode } from './nodes/PersonNode';
import { EditPersonPanel } from './EditPersonPanel';
import { ConnectionTypeModal } from './ConnectionTypeModal';
import { NodeContextMenu } from './NodeContextMenu';
import { ExportButton } from './ExportButton';

/* ─── Node Type Registry ─────────────────────────────────────── */

const nodeTypes: NodeTypes = {
    person: PersonNode,
};

/* ─── Props ──────────────────────────────────────────────────── */

interface TreeCanvasProps {
    /** Project name used as the file name for exports */
    projectName?: string;
}

/* ─── Context Menu State ─────────────────────────────────────── */

interface ContextMenuState {
    x: number;
    y: number;
    nodeId: string;
    nodeName: string;
}

/* ─── Inner Component (needs ReactFlowProvider ancestor) ────── */

function TreeCanvasInner({ projectName }: TreeCanvasProps) {
    const { mode } = useThemeStore();
    const nodes = useTreeStore((s) => s.nodes);
    const edges = useTreeStore((s) => s.edges);
    const onNodesChange = useTreeStore((s) => s.onNodesChange);
    const onEdgesChange = useTreeStore((s) => s.onEdgesChange);
    const createRelationship = useTreeStore((s) => s.createRelationship);
    const createPerson = useTreeStore((s) => s.createPerson);
    const deletePerson = useTreeStore((s) => s.deletePerson);

    const { fitView } = useReactFlow();

    // Selected node for the edit panel
    const [selectedNode, setSelectedNode] = useState<Node<PersonNodeData> | null>(null);

    // Pending connection for the type-picker modal
    const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

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
            setContextMenu(null);
        },
        [],
    );

    /** When the canvas background is clicked, close the edit panel and context menu */
    const handlePaneClick = useCallback(() => {
        setSelectedNode(null);
        setContextMenu(null);
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

    /** Right-click on a node → open context menu */
    const handleNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node<PersonNodeData>) => {
            event.preventDefault();
            event.stopPropagation();
            setContextMenu({
                x: event.clientX,
                y: event.clientY,
                nodeId: node.id,
                nodeName: node.data.fullName || 'Unknown',
            });
        },
        [],
    );

    /** Handle Delete key to remove selected node */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only process Delete/Backspace if no input is focused
            const target = e.target as HTMLElement;
            const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
            if (isInputFocused) return;

            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
                e.preventDefault();
                deletePerson(selectedNode.id);
                setSelectedNode(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNode, deletePerson]);

    /** Context menu: Add a child to the selected node */
    const handleAddChild = useCallback(async () => {
        if (!contextMenu) return;
        const parentId = contextMenu.nodeId;

        // Create a new person first
        await createPerson({ firstName: 'New', lastName: 'Person', gender: 'U' });

        // The newly created person is the last node in the store
        const currentNodes = useTreeStore.getState().nodes;
        const newNode = currentNodes[currentNodes.length - 1];
        if (newNode) {
            // Create parent→child relationship
            await createRelationship(parentId, newNode.id, 'PARENT');
            // Select the new node for editing
            setSelectedNode(newNode);
            setTimeout(() => fitView({ duration: 300 }), 100);
        }
    }, [contextMenu, createPerson, createRelationship, fitView]);

    /** Context menu: Add a spouse to the selected node */
    const handleAddSpouse = useCallback(async () => {
        if (!contextMenu) return;
        const partnerId = contextMenu.nodeId;

        await createPerson({ firstName: 'New', lastName: 'Person', gender: 'U' });

        const currentNodes = useTreeStore.getState().nodes;
        const newNode = currentNodes[currentNodes.length - 1];
        if (newNode) {
            await createRelationship(partnerId, newNode.id, 'SPOUSE');
            setSelectedNode(newNode);
            setTimeout(() => fitView({ duration: 300 }), 100);
        }
    }, [contextMenu, createPerson, createRelationship, fitView]);

    /** Context menu: Add a parent to the selected node */
    const handleAddParent = useCallback(async () => {
        if (!contextMenu) return;
        const childId = contextMenu.nodeId;

        await createPerson({ firstName: 'New', lastName: 'Person', gender: 'U' });

        const currentNodes = useTreeStore.getState().nodes;
        const newNode = currentNodes[currentNodes.length - 1];
        if (newNode) {
            // New person is parent OF the context node
            await createRelationship(newNode.id, childId, 'PARENT');
            setSelectedNode(newNode);
            setTimeout(() => fitView({ duration: 300 }), 100);
        }
    }, [contextMenu, createPerson, createRelationship, fitView]);

    /** Context menu: Delete the node */
    const handleDeleteFromMenu = useCallback(async () => {
        if (!contextMenu) return;
        await deletePerson(contextMenu.nodeId);
        if (selectedNode?.id === contextMenu.nodeId) {
            setSelectedNode(null);
        }
    }, [contextMenu, deletePerson, selectedNode]);

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
                onNodeContextMenu={handleNodeContextMenu}
                nodeTypes={nodeTypes}
                colorMode={mode}
                fitView
                fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
                minZoom={0.1}
                maxZoom={2}
                defaultEdgeOptions={{
                    animated: false,
                    style: { strokeWidth: 2 },
                }}
                proOptions={{ hideAttribution: true }}
                deleteKeyCode={null}
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

                {/* ── Export Button (top-right panel) ── */}
                <Panel position="top-right">
                    <ExportButton projectName={projectName} />
                </Panel>
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

            {/* ── Node Context Menu ── */}
            {contextMenu && (
                <NodeContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    nodeId={contextMenu.nodeId}
                    nodeName={contextMenu.nodeName}
                    onAddChild={handleAddChild}
                    onAddSpouse={handleAddSpouse}
                    onAddParent={handleAddParent}
                    onDelete={handleDeleteFromMenu}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
}

/* ─── TreeCanvas (wraps inner with provider) ─────────────────── */

export function TreeCanvas({ projectName }: TreeCanvasProps) {
    return (
        <ReactFlowProvider>
            <TreeCanvasInner projectName={projectName} />
        </ReactFlowProvider>
    );
}
