import React from 'react';
import type { CanvasState } from '@/entities/canvas/model/types';
import type { Node } from '@/entities/node/model/types';

interface CanvasProps {
  canvasState: CanvasState;
  nodes: Node[];
  onNodePositionChange: (id: string, x: number, y: number) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  canvasState,
  nodes,
  onNodePositionChange,
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
      >
        <div className="canvas-origin" />
        <div
          className="canvas-inner"
          style={{
            transform: `translate(${canvasState.offsetX}px, ${canvasState.offsetY}px)`,
          }}
        >
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
                <button className="node-play-button">▶</button>
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
                  <span className="node-response-placeholder">
                    {node.modelResponse ?? 'Ответ модели появится здесь'}
                  </span>
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
