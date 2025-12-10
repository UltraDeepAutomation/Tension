import React from 'react';
import type { ToolMode } from '@/entities/canvas/model/types';

interface ToolbarProps {
  tool: ToolMode;
  zoom: number;
  onToolChange: (tool: ToolMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  zoom,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  return (
    <div className="toolbar">
      <button
        className={
          'toolbar-button' + (tool === 'cursor' ? ' toolbar-button--active' : '')
        }
        onClick={() => onToolChange('cursor')}
      >
        ⌖
      </button>
      <button
        className={
          'toolbar-button' + (tool === 'hand' ? ' toolbar-button--active' : '')
        }
        onClick={() => onToolChange('hand')}
      >
        ✋
      </button>
      <div className="toolbar-spacer" />
      <button className="toolbar-button" onClick={onZoomOut}>
        -
      </button>
      <button className="toolbar-button" onClick={onResetZoom}>
        {zoomLabel}
      </button>
      <button className="toolbar-button" onClick={onZoomIn}>
        +
      </button>
    </div>
  );
};
