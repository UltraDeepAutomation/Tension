import React from 'react';
import type { CanvasState } from '@/entities/canvas/model/types';
import type { Node, Connection } from '@/entities/node/model/types';

interface CanvasProps {
  canvasState: CanvasState;
  nodes: Node[];
  connections: Connection[];
  onNodePositionChange: (id: string, x: number, y: number) => void;
  onChangeZoom: (delta: number) => void;
  isZoomModifierActive: boolean;
  onPlayNode: (id: string) => void;
}

const NODE_WIDTH = 320;
const NODE_HEIGHT = 220;

export const Canvas: React.FC<CanvasProps> = ({
  canvasState,
  nodes,
  connections,
  onNodePositionChange,
  onChangeZoom,
  isZoomModifierActive,
  onPlayNode,
}) => {
  const zoomLabel = `${Math.round(canvasState.zoom * 100)}%`;

  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const dragStartRef = React.useRef<{ mouseX: number; mouseY: number; nodeX: number; nodeY: number } | null>(null);

  const handleHeaderMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
    node: Node
  ) => {
    event.preventDefault();
    const rect = (event.currentTarget.ownerDocument?.documentElement || event.currentTarget).getBoundingClientRect();
    dragStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };
    setDraggingId(node.id);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId || !dragStartRef.current) return;
    event.preventDefault();
    const { mouseX, mouseY, nodeX, nodeY } = dragStartRef.current;
    const dx = (event.clientX - mouseX) / canvasState.zoom;
    const dy = (event.clientY - mouseY) / canvasState.zoom;
    onNodePositionChange(draggingId, nodeX + dx, nodeY + dy);
  };

  const handleMouseUp = () => {
    setDraggingId(null);
    dragStartRef.current = null;
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.metaKey || isZoomModifierActive) {
      event.preventDefault();
      const delta = -event.deltaY * 0.001;
      if (delta !== 0) {
        onChangeZoom(delta);
      }
    }
  };

  return (
    <main className="canvas-container">
      <div className="canvas-toolbar-top">
        <div className="canvas-zoom-indicator">Zoom: {zoomLabel}</div>
      </div>
      <div
        className="canvas-view"
        style={{ transform: `scale(${canvasState.zoom})` }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <div className="canvas-origin" />
        <div
          className="canvas-inner"
          style={{
            transform: `translate(${canvasState.offsetX}px, ${canvasState.offsetY}px)`,
          }}
        >
          {/* SVG слой для соединений */}
          <svg className="canvas-connections">
            {connections.map((conn) => {
              const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
              const toNode = nodes.find((n) => n.id === conn.toNodeId);
              if (!fromNode || !toNode) return null;

              // Позиция выходного порта (справа от родителя)
              const portCount = fromNode.branchCount;
              const portSpacing = 14; // gap + port height
              const portsHeight = portCount * portSpacing;
              const portY = fromNode.y + NODE_HEIGHT / 2 - portsHeight / 2 + conn.fromPortIndex * portSpacing + 4;
              const x1 = fromNode.x + NODE_WIDTH + 4;
              const y1 = portY;

              // Позиция входного порта (слева от ребёнка)
              const x2 = toNode.x - 4;
              const y2 = toNode.y + NODE_HEIGHT / 2;

              // Кривая Безье
              const cx = (x1 + x2) / 2;
              const path = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;

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
              className={
                'node' + (node.isRoot ? ' node--root' : '')
              }
              style={{ left: node.x, top: node.y }}
            >
              <div
                className="node-header"
                onMouseDown={(event) => handleHeaderMouseDown(event, node)}
              >
                <span className="node-title">
                  {node.isRoot ? 'Root' : 'Node'}
                </span>
                <button
                  className={'node-play-button' + (node.isPlaying ? ' node-play-button--loading' : '')}
                  type="button"
                  onClick={() => onPlayNode(node.id)}
                  disabled={node.isPlaying}
                >
                  {node.isPlaying ? '...' : '▶'}
                </button>
              </div>
              <div className="node-ports node-ports--left">
                <div className="node-port" />
              </div>
              <div className="node-ports node-ports--right">
                {Array.from({ length: node.branchCount }).map((_, index) => (
                  <div key={index} className="node-port" />
                ))}
              </div>
              <div className="node-body">
                <textarea
                  className="node-prompt"
                  placeholder="Вопрос / контекст..."
                  defaultValue={node.prompt}
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
                  <select defaultValue={node.branchCount}>
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
