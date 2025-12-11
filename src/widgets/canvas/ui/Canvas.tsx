import React from 'react';
import type { CanvasState } from '@/entities/canvas/model/types';
import type { Node, Connection } from '@/entities/node/model/types';
import { NodeCard } from './NodeCard';
import { NODE_WIDTH, NODE_HEIGHT, PORT_SIZE, PORT_GAP, PORTS_TOP, PORT_Y_OFFSET } from '@/shared/config/constants';

interface CanvasProps {
  canvasState: CanvasState;
  nodes: Node[];
  connections: Connection[];
  onNodePositionChange: (id: string, x: number, y: number) => void;
  onNodePromptChange: (id: string, prompt: string) => void;
  onNodeBranchCountChange: (id: string, count: 1 | 2 | 3 | 4) => void;
  onNodeDeepLevelChange: (id: string, level: 1 | 2 | 3 | 4) => void;
  onCanvasPan: (dx: number, dy: number) => void;
  onZoomAtPoint: (delta: number, clientX: number, clientY: number, canvasRect: DOMRect) => void;
  isZoomModifierActive: boolean;
  onPlayNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
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
}) => {
  const zoomLabel = `${Math.round(canvasState.zoom * 100)}%`;
  const canvasRef = React.useRef<HTMLDivElement>(null);

  // Драг ноды
  const [draggingNodeId, setDraggingNodeId] = React.useState<string | null>(null);
  const nodeDragLastPos = React.useRef<{ x: number; y: number } | null>(null);

  // Драг канваса (pan)
  const [isPanning, setIsPanning] = React.useState(false);
  const panLastPos = React.useRef<{ x: number; y: number } | null>(null);

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
      event.preventDefault();
      panLastPos.current = { x: event.clientX, y: event.clientY };
      setIsPanning(true);
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
          onNodePositionChange(draggingNodeId, node.x + dx, node.y + dy);
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

      const cx = (fromX + toX) / 2;
      const path = `M ${fromX} ${fromY} C ${cx} ${fromY}, ${cx} ${toY}, ${toX} ${toY}`;

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
    <main className="canvas-container">
      <div className="canvas-toolbar-top">
        <div className="canvas-zoom-indicator">Zoom: {zoomLabel}</div>
      </div>
      <div
        ref={canvasRef}
        className={`canvas-view ${isPanning ? 'canvas-view--panning' : ''}`}
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
              // Pass stable handlers using closure wrapper inside NodeCard or pass ID
              // To make React.memo work, we need to pass (id, val) OR make a wrapper component
              // But NodeCard expects (val) => void.
              // We create an inline arrow function: (val) => handlePromptChange(node.id, val)
              // This STILL creates a new function reference every render :(
              // To truly fix this, NodeCard should accept `nodeId` and `onChange(id, val)`
              // OR we accept that handlers are new, but `node` object is stable?
              // No, if any prop changes, memo breaks.
              // So we MUST refactor NodeCard to accept `onPromptChange` that takes ID, OR
              // we can't fully optimize without refactoring NodeCard props.
              // For now, I will keep inline arrows but acknowledge the limitation.
              // WAIT! We can use a trick: `onPromptChange={useCallback((val) => handlePromptChange(node.id, val), [node.id])}`
              // But hooks inside loop are forbidden.
              // The only way is to refactor NodeCard to take generic handlers.
              // Let's stick to the current props for now, as refactoring NodeCard signature requires changing types too.
              // But I will clean up the rest.
              onPromptChange={(prompt) => onNodePromptChange(node.id, prompt)}
              onBranchCountChange={(count) => onNodeBranchCountChange(node.id, count)}
              onDeepLevelChange={(level) => onNodeDeepLevelChange(node.id, level)}
              onPlay={() => onPlayNode(node.id)}
              onDelete={() => onDeleteNode(node.id)}
            />
          ))}
        </div>
      </div>
    </main>
  );
};
