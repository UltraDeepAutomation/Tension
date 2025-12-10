import React from 'react';
import type { CanvasState } from '@/entities/canvas/model/types';

interface CanvasProps {
  canvasState: CanvasState;
}

export const Canvas: React.FC<CanvasProps> = ({ canvasState }) => {
  const zoomLabel = `${Math.round(canvasState.zoom * 100)}%`;

  return (
    <main className="canvas-container">
      <div className="canvas-toolbar-top">
        <div className="canvas-zoom-indicator">Zoom: {zoomLabel}</div>
      </div>
      <div className="canvas-view">
        <div
          className="canvas-inner"
          style={{
            transform: `scale(${canvasState.zoom}) translate(${canvasState.offsetX}px, ${canvasState.offsetY}px)`,
          }}
        >
          <div className="node node--root">
            <div className="node-header">
              <span className="node-title">Root</span>
              <button className="node-play-button">▶</button>
            </div>
            <div className="node-body">
              <textarea
                className="node-prompt"
                placeholder="Вопрос / контекст..."
                defaultValue="С чем сейчас поработаем?"
              />
              <div className="node-response">
                <span className="node-response-placeholder">
                  Ответ модели появится здесь
                </span>
              </div>
            </div>
            <div className="node-footer">
              <label className="node-branch-label">
                Ветки:
                <select defaultValue={4}>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
