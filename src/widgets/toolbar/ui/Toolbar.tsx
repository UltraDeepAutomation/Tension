import React from 'react';

interface ToolbarProps {
  onToggleSettings: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onToggleSettings }) => {
  return (
    <div className="toolbar">
      <button className="toolbar-button toolbar-button--active">Курсор</button>
      <button className="toolbar-button">Рука</button>
      <div className="toolbar-spacer" />
      <button className="toolbar-button">-</button>
      <button className="toolbar-button">100%</button>
      <button className="toolbar-button">+</button>
      <div className="toolbar-spacer" />
      <button className="toolbar-button" onClick={onToggleSettings}>
        Настройки
      </button>
    </div>
  );
};
