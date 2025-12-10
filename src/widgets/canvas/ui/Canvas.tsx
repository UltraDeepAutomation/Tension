import React from 'react';

export const Canvas: React.FC = () => {
  return (
    <main className="canvas-container">
      <div className="canvas-toolbar-top">
        <div className="canvas-zoom-indicator">Zoom: 100%</div>
        <button className="canvas-settings-button">Настройки</button>
      </div>
      <div className="canvas-view">
        <div className="canvas-inner">
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
