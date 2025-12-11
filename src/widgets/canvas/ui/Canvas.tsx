import React from 'react';
import type { CanvasState } from '@/entities/canvas/model/types';
import type { Node, Connection } from '@/entities/node/model/types';
import { NodeCard } from './NodeCard';

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
}

// Размеры ноды для расчёта соединений
const NODE_WIDTH = 340;
const NODE_HEIGHT = 180;

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
}) => {
  const zoomLabel = `${Math.round(canvasState.zoom * 100)}%`;
  const canvasRef = React.useRef<HTMLDivElement>(null);

  // Драг ноды
  const [draggingNodeId, setDraggingNodeId] = React.useState<string | null>(null);
  const nodeDragStartRef = React.useRef<{ mouseX: number; mouseY: number; nodeX: number; nodeY: number } | null>(null);

  // Драг канваса (pan)
  const [isPanning, setIsPanning] = React.useState(false);
  const panStartRef = React.useRef<{ mouseX: number; mouseY: number; offsetX: number; offsetY: number } | null>(null);

  const handleNodeHeaderMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
    node: Node
  ) => {
    event.preventDefault();
    event.stopPropagation();
    nodeDragStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };
    setDraggingNodeId(node.id);
  };

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    // Начинаем pan только если клик не по ноде
    if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains('canvas-inner')) {
      event.preventDefault();
      panStartRef.current = {
        mouseX: event.clientX,
        mouseY: event.clientY,
        offsetX: canvasState.offsetX,
        offsetY: canvasState.offsetY,
      };
      setIsPanning(true);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    // Драг ноды
    if (draggingNodeId && nodeDragStartRef.current) {
      event.preventDefault();
      const { mouseX, mouseY, nodeX, nodeY } = nodeDragStartRef.current;
      const dx = (event.clientX - mouseX) / canvasState.zoom;
      const dy = (event.clientY - mouseY) / canvasState.zoom;
      onNodePositionChange(draggingNodeId, nodeX + dx, nodeY + dy);
      return;
    }

    // Pan канваса
    if (isPanning && panStartRef.current) {
      event.preventDefault();
      const { mouseX, mouseY } = panStartRef.current;
      const dx = (event.clientX - mouseX) / canvasState.zoom;
      const dy = (event.clientY - mouseY) / canvasState.zoom;
      onCanvasPan(dx, dy);
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    nodeDragStartRef.current = null;
    setIsPanning(false);
    panStartRef.current = null;
  };

  // Блокируем скролл страницы внутри канваса
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.metaKey || event.ctrlKey || isZoomModifierActive) {
        // Zoom к позиции курсора
        const delta = -event.deltaY * 0.001;
        if (delta !== 0) {
          const rect = canvas.getBoundingClientRect();
          onZoomAtPoint(delta, event.clientX, event.clientY, rect);
        }
      } else {
        // Pan
        const dx = -event.deltaX / canvasState.zoom;
        const dy = -event.deltaY / canvasState.zoom;
        onCanvasPan(dx, dy);
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [canvasState.zoom, isZoomModifierActive, onZoomAtPoint, onCanvasPan]);

  // Вычисляем позицию порта относительно ноды
  // Порты начинаются на 50px от верха ноды
  // port size = 8px, gap = 6px
  const getPortPosition = (
    node: Node,
    side: 'left' | 'right',
    portIndex: number,
    _totalPorts: number
  ) => {
    const PORT_SIZE = 8;
    const PORT_GAP = 6;
    const PORTS_TOP = 50; // CSS: top: 50px
    
    // Y позиция центра конкретного порта
    const portCenterY = PORTS_TOP + portIndex * (PORT_SIZE + PORT_GAP) + PORT_SIZE / 2;

    // X позиция — центр порта на краю ноды
    const x = side === 'left' ? node.x : node.x + NODE_WIDTH;
    const y = node.y + portCenterY;

    return { x, y };
  };

  return (
    <main className="canvas-container">
      <div className="canvas-toolbar-top">
        <div className="canvas-zoom-indicator">Zoom: {zoomLabel}</div>
      </div>
      <div
        ref={canvasRef}
        className={`canvas-view ${isPanning ? 'canvas-view--panning' : ''}`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="canvas-inner"
          style={{
            transform: `scale(${canvasState.zoom}) translate(${canvasState.offsetX}px, ${canvasState.offsetY}px)`,
          }}
        >
          {/* SVG слой для соединений */}
          <svg className="canvas-connections">
            {connections.map((conn) => {
              const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
              const toNode = nodes.find((n) => n.id === conn.toNodeId);
              if (!fromNode || !toNode) return null;

              const fromPos = getPortPosition(fromNode, 'right', conn.fromPortIndex, fromNode.branchCount);
              const toPos = getPortPosition(toNode, 'left', 0, 1);

              // Кривая Безье
              const cx = (fromPos.x + toPos.x) / 2;
              const path = `M ${fromPos.x} ${fromPos.y} C ${cx} ${fromPos.y}, ${cx} ${toPos.y}, ${toPos.x} ${toPos.y}`;

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
            })}
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
    </main>
  );
};
