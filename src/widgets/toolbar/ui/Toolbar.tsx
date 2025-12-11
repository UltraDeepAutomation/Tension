import React from 'react';
import type { ToolMode } from '@/entities/canvas/model/types';

interface ToolbarProps {
  tool: ToolMode;
  zoom: number;
  onToolChange: (tool: ToolMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onCenterCanvas: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  zoom,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onCenterCanvas,
}) => {
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  return (
    <div className="toolbar">
      <button
        className={
          'toolbar-button' + (tool === 'cursor' ? ' toolbar-button--active' : '')
        }
        onClick={() => onToolChange('cursor')}
        title="Cursor (V)"
      >
        <IconCursor width={18} height={18} />
      </button>
      <button
        className={
          'toolbar-button' + (tool === 'hand' ? ' toolbar-button--active' : '')
        }
        onClick={() => onToolChange('hand')}
        title="Hand (H)"
      >
        <IconHand width={18} height={18} />
      </button>
      <div className="toolbar-spacer" />
      <button className="toolbar-button" onClick={onZoomOut} title="Zoom Out (-)">
        <IconMinus width={18} height={18} />
      </button>
      <button className="toolbar-button" onClick={onResetZoom} title="Reset Zoom">
        {zoomLabel}
      </button>
      <button className="toolbar-button" onClick={onZoomIn} title="Zoom In (+)">
        <IconPlus width={18} height={18} />
      </button>
      <div className="toolbar-spacer" />
      <button className="toolbar-button" onClick={onCenterCanvas} title="Fit to View">
        <IconTarget width={18} height={18} />
      </button>
    </div>
  );
};
