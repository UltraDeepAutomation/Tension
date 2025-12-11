import React from 'react';
import type { CanvasState } from '@/entities/canvas/model/types';
import type { Node, Connection } from '@/entities/node/model/types';

interface CanvasProps {
  canvasState: CanvasState;
  nodes: Node[];
  connections: Connection[];
  onNodePositionChange: (id: string, x: number, y: number) => void;
  onCanvasPan: (dx: number, dy: number) => void;
  onZoomAtPoint: (delta: number, clientX: number, clientY: number, canvasRect: DOMRect) => void;
  isZoomModifierActive: boolean;
  onPlayNode: (id: string) => void;
}

// Размеры ноды для расчёта соединений
const NODE_WIDTH = 320;
const NODE_HEIGHT = 220;

export const Canvas: React.FC<CanvasProps> = ({
  canvasState,
  nodes,
  connections,
  onNodePositionChange,
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
  const getPortPosition = (
    node: Node,
    side: 'left' | 'right',
    portIndex: number,
    totalPorts: number
  ) => {
    const portGap = 14; // gap + port height
    const totalHeight = totalPorts * portGap;
    const startY = NODE_HEIGHT / 2 - totalHeight / 2 + portGap / 2;

    const x = side === 'left' ? node.x : node.x + NODE_WIDTH;
    const y = node.y + startY + portIndex * portGap;

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
            <div
              key={node.id}
              className={'node' + (node.isRoot ? ' node--root' : '') + (draggingNodeId === node.id ? ' node--dragging' : '')}
              style={{ left: node.x, top: node.y }}
            >
              <div
                className="node-header"
                onMouseDown={(event) => handleNodeHeaderMouseDown(event, node)}
              >
                <span className="node-title">
                  {node.isRoot ? 'Root' : 'Node'}
                </span>
                <button
                  className={'node-play-button' + (node.isPlaying ? ' node-play-button--loading' : '')}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayNode(node.id);
                  }}
                  disabled={node.isPlaying}
                >
                  {node.isPlaying ? '...' : '▶'}
                </button>
              </div>
              <div className="node-ports node-ports--left">
                <div className="node-port node-port--input" />
              </div>
              <div className="node-ports node-ports--right">
                {Array.from({ length: node.branchCount }).map((_, index) => (
                  <div key={index} className="node-port node-port--output" />
                ))}
              </div>
              <div className="node-body">
                <textarea
                  className="node-prompt"
                  placeholder="Вопрос / контекст..."
                  defaultValue={node.prompt}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="node-response">
                  {node.isPlaying ? (
                    <span className="node-response-loading">Модель думает...</span>
                  ) : (
                    <span className="node-response-placeholder">
                      {node.modelResponse ?? 'Ответ модели появится здесь'}
                    </span>
                  )}
                </div>
              </div>
              <div className="node-footer">
                <label className="node-branch-label">
                  Ветки:
                  <select defaultValue={node.branchCount} onClick={(e) => e.stopPropagation()}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};
