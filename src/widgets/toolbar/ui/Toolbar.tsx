import React, { useRef } from 'react';
import type { ToolMode } from '@/entities/canvas/model/types';
import { MousePointer2, Hand, Home, Undo2, Redo2, Save, Check, Loader2, Circle, Download, Upload } from 'lucide-react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved';

interface ToolbarProps {
  tool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  onCenterCanvas: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onExport?: () => void;
  onImport?: (file: File) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  saveStatus?: SaveStatus;
}

const ToolbarComponent: React.FC<ToolbarProps> = ({
  tool,
  onToolChange,
  onCenterCanvas,
  onUndo,
  onRedo,
  onSave,
  onExport,
  onImport,
  canUndo = false,
  canRedo = false,
  saveStatus = 'saved',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      onImport(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

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

      <div className="toolbar-divider" />

      {/* Center */}
      <button className="toolbar-button" onClick={onCenterCanvas} title="Центрировать (Home)">
        <Home size={16} />
      </button>

      <div className="toolbar-divider" />

      {/* Export/Import */}
      {onExport && (
        <button 
          className="toolbar-button" 
          onClick={onExport}
          title="Экспорт JSON"
        >
          <Download size={16} />
        </button>
      )}
      {onImport && (
        <>
          <button 
            className="toolbar-button" 
            onClick={handleImportClick}
            title="Импорт JSON"
          >
            <Upload size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </>
      )}

      <div className="toolbar-spacer" />

      {/* Save Button */}
      <button 
        className={`toolbar-button toolbar-save ${
          saveStatus === 'saved' ? 'toolbar-save--saved' : ''
        } ${
          saveStatus === 'saving' ? 'toolbar-save--saving' : ''
        } ${
          saveStatus === 'unsaved' ? 'toolbar-save--unsaved' : ''
        }`}
        onClick={onSave}
        disabled={saveStatus === 'saving' || saveStatus === 'saved'}
        title={
          saveStatus === 'saved' ? 'Сохранено' : 
          saveStatus === 'saving' ? 'Сохранение...' : 
          saveStatus === 'unsaved' ? 'Сохранить (⌘S)' :
          'Сохранить'
        }
      >
        {saveStatus === 'saving' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : saveStatus === 'saved' ? (
          <Check size={16} />
        ) : saveStatus === 'unsaved' ? (
          <>
            <Circle size={8} className="toolbar-save-dot" />
            <Save size={16} />
          </>
        ) : (
          <Save size={16} />
        )}
      </button>
    </div>
  );
};

export const Toolbar = React.memo(ToolbarComponent);
Toolbar.displayName = 'Toolbar';
