import React from 'react';
import type { CanvasState } from '@/entities/canvas/model/types';
import type { Node, Connection } from '@/entities/node/model/types';
import { NodeCard } from './NodeCard';
import { ContextMenu, ContextMenuItem } from '@/widgets/context-menu/ui/ContextMenu';
import { NODE_WIDTH, NODE_HEIGHT, PORT_SIZE, PORT_GAP, PORTS_TOP, PORT_Y_OFFSET } from '@/shared/config/constants';

interface CanvasProps {
  canvasState: CanvasState;
  nodes: Node[];
  connections: Connection[];
  onNodePositionChange: (id: string, x: number, y: number, isTransient?: boolean) => void;
  onNodePromptChange: (id: string, prompt: string) => void;
  onNodeBranchCountChange: (id: string, count: 1 | 2 | 3 | 4) => void;
  onNodeDeepLevelChange: (id: string, level: 1 | 2 | 3 | 4) => void;
  onCanvasPan: (dx: number, dy: number) => void;
  onZoomAtPoint: (delta: number, clientX: number, clientY: number, canvasRect: DOMRect) => void;
  isZoomModifierActive: boolean;
  onPlayNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onCenterCanvas: () => void;
  onResetZoom: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  canvasState,
  nodes,
  connections,
  onNodePositionChange,
  onNodePromptChange,
  onNodeBranchCountChange,
  onNodeDeepLevelChange,
  onCanvasPan,
  onZoomAtPoint,
  isZoomModifierActive,
  onPlayNode,
  onDeleteNode,
  onDuplicateNode,
  onCenterCanvas,
  onResetZoom,
}) => {
  const canvasRef = React.useRef<HTMLDivElement>(null);

  // Драг ноды
  const [draggingNodeId, setDraggingNodeId] = React.useState<string | null>(null);
  const nodeDragLastPos = React.useRef<{ x: number; y: number } | null>(null);

  // Драг канваса (pan)
  const [isPanning, setIsPanning] = React.useState(false);
  const panLastPos = React.useRef<{ x: number; y: number } | null>(null);

  // Context Menu
  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
    type: 'canvas' | 'node';
    targetId?: string;
  } | null>(null);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    const nodeEl = (event.target as HTMLElement).closest('.node');
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id');
      if (nodeId) {
        setContextMenu({ x: event.clientX, y: event.clientY, type: 'node', targetId: nodeId });
        return;
      }
    }
    setContextMenu({ x: event.clientX, y: event.clientY, type: 'canvas' });
  };

  const contextMenuItems: ContextMenuItem[] = React.useMemo(() => {
    if (!contextMenu) return [];
    if (contextMenu.type === 'node' && contextMenu.targetId) {
      const id = contextMenu.targetId;
      return [
        {
          label: 'Дублировать',
          icon: '⎘', 
          onClick: () => onDuplicateNode(id),
        },
        {
          label: 'Удалить',
          icon: '×',
          onClick: () => onDeleteNode(id),
          danger: true,
        },
        { label: 'Generate Response', icon: '▶', onClick: () => onPlayNode(id) },
      ];
    }
    return [
      { label: 'Fit View', icon: '⤢', onClick: onCenterCanvas },
      { label: 'Reset Zoom', icon: '0', onClick: onResetZoom },
    ];
  }, [contextMenu, onPlayNode, onDeleteNode, onCenterCanvas, onResetZoom]);

  // --- Handlers (Memoized) ---

  const handleNodeHeaderMouseDown = React.useCallback((
    event: React.MouseEvent<HTMLDivElement>,
    node: Node
  ) => {
    event.preventDefault();
    event.stopPropagation();
    nodeDragLastPos.current = { x: event.clientX, y: event.clientY };
    setDraggingNodeId(node.id);
  }, []);

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const isCanvas = target === event.currentTarget || 
                     target.classList.contains('canvas-inner') ||
                     target.classList.contains('canvas-view') ||
                     target.tagName === 'svg';

    if (isCanvas) {
      // In hand mode OR when clicking empty canvas, allow panning
      // In cursor mode, only pan if clicking on empty canvas (not nodes)
      if (canvasState.tool === 'hand' || isCanvas) {
        event.preventDefault();
        panLastPos.current = { x: event.clientX, y: event.clientY };
        setIsPanning(true);
      }
    }
  };

  // Memoized action wrappers for NodeCard to prevent re-renders
  const handlePromptChange = React.useCallback((id: string, prompt: string) => {
    onNodePromptChange(id, prompt);
  }, [onNodePromptChange]);

  const handleBranchCountChange = React.useCallback((id: string, count: 1 | 2 | 3 | 4) => {
    onNodeBranchCountChange(id, count);
  }, [onNodeBranchCountChange]);

  const handleDeepLevelChange = React.useCallback((id: string, level: 1 | 2 | 3 | 4) => {
    onNodeDeepLevelChange(id, level);
  }, [onNodeDeepLevelChange]);

  const handlePlay = React.useCallback((id: string) => {
    onPlayNode(id);
  }, [onPlayNode]);

  const handleDelete = React.useCallback((id: string) => {
    onDeleteNode(id);
  }, [onDeleteNode]);


  // Глобальные слушатели
  React.useEffect(() => {
    if (!draggingNodeId && !isPanning) return;

    const handleWindowMouseMove = (event: MouseEvent) => {
      // 1. Drag Node
      if (draggingNodeId && nodeDragLastPos.current) {
        event.preventDefault();
        const { x: lastX, y: lastY } = nodeDragLastPos.current;
        const dx = (event.clientX - lastX) / canvasState.zoom;
        const dy = (event.clientY - lastY) / canvasState.zoom;

        nodeDragLastPos.current = { x: event.clientX, y: event.clientY };
        
        // Find node locally to avoid dependency on 'nodes' array causing effect re-bind
        // But we need 'nodes' to get current position. 
        // We can pass current X/Y in setDraggingNodeId but position changes.
        // Better: onNodePositionChange handles delta or absolute. 
        // Here we need current node X/Y.
        // We have to depend on 'nodes'.
        const node = nodes.find((n) => n.id === draggingNodeId);
        if (node) {
          onNodePositionChange(draggingNodeId, node.x + dx, node.y + dy, true);
        }
      }

      // 2. Pan Canvas
      if (isPanning && panLastPos.current) {
        event.preventDefault();
        const { x: lastX, y: lastY } = panLastPos.current;
        const dx = (event.clientX - lastX) / canvasState.zoom;
        const dy = (event.clientY - lastY) / canvasState.zoom;

        panLastPos.current = { x: event.clientX, y: event.clientY };
        onCanvasPan(dx, dy);
      }
    };

    const handleWindowMouseUp = () => {
      if (draggingNodeId) {
        // Commit the final position to history
        const node = nodes.find((n) => n.id === draggingNodeId);
        if (node) {
           onNodePositionChange(draggingNodeId, node.x, node.y, false);
        }
      }
      setDraggingNodeId(null);
      nodeDragLastPos.current = null;
      setIsPanning(false);
      panLastPos.current = null;
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggingNodeId, isPanning, canvasState.zoom, nodes, onNodePositionChange, onCanvasPan]);


  // Wheel handling
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.metaKey || event.ctrlKey || isZoomModifierActive) {
        const delta = -event.deltaY * 0.001;
        if (delta !== 0) {
          const rect = canvas.getBoundingClientRect();
          onZoomAtPoint(delta, event.clientX, event.clientY, rect);
        }
      } else {
        const dx = -event.deltaX / canvasState.zoom;
        const dy = -event.deltaY / canvasState.zoom;
        onCanvasPan(dx, dy);
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [canvasState.zoom, isZoomModifierActive, onZoomAtPoint, onCanvasPan]);

  // --- Optimized Connections Rendering ---
  const connectionPaths = React.useMemo(() => {
    return connections.map((conn) => {
      const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
      const toNode = nodes.find((n) => n.id === conn.toNodeId);
      if (!fromNode || !toNode) return null;

      // Calculate positions using constants
      const fromPortY = PORTS_TOP + conn.fromPortIndex * (PORT_SIZE + PORT_GAP) + PORT_SIZE / 2 + PORT_Y_OFFSET;
      const fromX = fromNode.x + NODE_WIDTH;
      const fromY = fromNode.y + fromPortY;

      const toPortY = PORTS_TOP + 0 * (PORT_SIZE + PORT_GAP) + PORT_SIZE / 2 + PORT_Y_OFFSET;
      const toX = toNode.x;
      const toY = toNode.y + toPortY;

      // Smart(er) Routing
      const dist = Math.abs(toX - fromX);
      // Standard curvature for typical distance, reduced for very close nodes
      const curvature = Math.max(40, Math.min(dist * 0.5, 150));
      
      const cp1X = fromX + curvature;
      const cp2X = toX - curvature;

      // Use the standard cubic bezier: start -> cp1 -> cp2 -> end
      const path = `M ${fromX} ${fromY} C ${cp1X} ${fromY}, ${cp2X} ${toY}, ${toX} ${toY}`;

      return (
        <path
          key={conn.id}
          className="canvas-connection"
          d={path}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
        />
      );
    });
  }, [nodes, connections]);

  return (
    <main className="canvas-container" onContextMenu={handleContextMenu}>
      <div
        ref={canvasRef}
        className={`canvas-view ${canvasState.tool === 'hand' ? 'canvas-view--hand' : ''} ${isPanning ? 'canvas-view--panning' : ''}`}
        onMouseDown={handleCanvasMouseDown}
        style={{
          backgroundSize: `${24 * canvasState.zoom}px ${24 * canvasState.zoom}px`,
          backgroundPosition: `${canvasState.offsetX * canvasState.zoom}px ${canvasState.offsetY * canvasState.zoom}px`,
        }}
      >
        <div
          className="canvas-inner"
          style={{
            transform: `scale(${canvasState.zoom}) translate(${canvasState.offsetX}px, ${canvasState.offsetY}px)`,
          }}
        >
          <svg className="canvas-connections">
            {connectionPaths}
          </svg>

          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              isDragging={draggingNodeId === node.id}
              onHeaderMouseDown={(e) => handleNodeHeaderMouseDown(e, node)}
              onPromptChange={(prompt) => onNodePromptChange(node.id, prompt)}
              onBranchCountChange={(count) => onNodeBranchCountChange(node.id, count)}
              onDeepLevelChange={(level) => onNodeDeepLevelChange(node.id, level)}
              onPlay={() => onPlayNode(node.id)}
            />
          ))}
        </div>
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </main>
  );
};
