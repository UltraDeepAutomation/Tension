import React from 'react';
import type { ToolMode } from '@/entities/canvas/model/types';
import { MousePointer2, Hand, Home, Undo2, Redo2, Save, Check, Loader2 } from 'lucide-react';

type SaveStatus = 'idle' | 'saving' | 'saved';

interface ToolbarProps {
  tool: ToolMode;
  zoom: number;
  onToolChange: (tool: ToolMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onCenterCanvas: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  saveStatus?: SaveStatus;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  zoom,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onCenterCanvas,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  saveStatus = 'idle',
}) => {
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  return (
    <div className="toolbar">
      {/* Tool Selection */}
      <button
        className={`toolbar-button ${tool === 'cursor' ? 'toolbar-button--active' : ''}`}
        onClick={() => onToolChange('cursor')}
        title="Выбор (V)"
      >
        <MousePointer2 size={16} />
      </button>
      <button
        className={`toolbar-button ${tool === 'hand' ? 'toolbar-button--active' : ''}`}
        onClick={() => onToolChange('hand')}
        title="Перемещение (H)"
      >
        <Hand size={16} />
      </button>

      <div className="toolbar-divider" />

      {/* Undo/Redo */}
      {onUndo && (
        <button 
          className="toolbar-button" 
          onClick={onUndo} 
          disabled={!canUndo}
          title="Отменить (⌘Z)"
        >
          <Undo2 size={16} />
        </button>
      )}
      {onRedo && (
        <button 
          className="toolbar-button" 
          onClick={onRedo} 
          disabled={!canRedo}
          title="Повторить (⌘⇧Z)"
        >
          <Redo2 size={16} />
        </button>
      )}

      <div className="toolbar-spacer" />

      {/* Zoom Controls */}
      <div className="toolbar-zoom">
        <button className="toolbar-button" onClick={onZoomOut} title="Уменьшить">
          −
        </button>
        <button className="toolbar-button" onClick={onResetZoom} title="Сбросить масштаб">
          {zoomLabel}
        </button>
        <button className="toolbar-button" onClick={onZoomIn} title="Увеличить">
          +
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Center */}
      <button className="toolbar-button" onClick={onCenterCanvas} title="Центрировать (Home)">
        <Home size={16} />
      </button>

      {/* Save Status */}
      <button 
        className={`toolbar-button ${saveStatus === 'saved' ? 'toolbar-button--success' : ''} ${saveStatus === 'saving' ? 'toolbar-button--saving' : ''}`}
        disabled
        title={saveStatus === 'saved' ? 'Сохранено' : saveStatus === 'saving' ? 'Сохранение...' : 'Автосохранение'}
      >
        {saveStatus === 'saving' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : saveStatus === 'saved' ? (
          <Check size={16} />
        ) : (
          <Save size={16} />
        )}
      </button>
    </div>
  );
};
