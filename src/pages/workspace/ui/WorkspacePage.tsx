import React from 'react';
import { Sidebar } from '@/widgets/sidebar/ui/Sidebar';
import { Canvas } from '@/widgets/canvas/ui/Canvas';
import { Toolbar } from '@/widgets/toolbar/ui/Toolbar';
import { SettingsPanel } from '@/widgets/settings-panel/ui/SettingsPanel';
import { useWorkspaceModel } from '@/pages/workspace/model/useWorkspaceModel';
import { useOpenAIKey } from '@/features/manage-openai-key/model/useOpenAIKey';
import { CommandPalette, CommandAction } from '@/widgets/command-palette/ui/CommandPalette';
import { Minimap } from '@/widgets/minimap/ui/Minimap';
import { Loader2 } from 'lucide-react';

export const WorkspacePage: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isCmdKOpen, setIsCmdKOpen] = React.useState(false);
  const { state, actions } = useWorkspaceModel();
  const { apiKey, isLoaded, hasKey, updateKey } = useOpenAIKey();
  
  // Tool state management
  const [isSpacePressed, setIsSpacePressed] = React.useState(false);
  const [isMetaPressed, setIsMetaPressed] = React.useState(false);
  
  // The "permanent" tool selected via toolbar (cursor or hand)
  const permanentToolRef = React.useRef<'cursor' | 'hand'>('cursor');
  
  // Update permanent tool only when user clicks toolbar buttons
  const handleToolChange = React.useCallback((tool: 'cursor' | 'hand') => {
    permanentToolRef.current = tool;
    actions.setTool(tool);
  }, [actions]);

  // Keyboard modifiers for temporary tool switching
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      // Cmd+K for command palette
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsCmdKOpen((prev) => !prev);
        return;
      }

      // V for cursor tool
      if (event.key === 'v' || event.key === 'V') {
        if (!event.metaKey && !event.ctrlKey) {
          permanentToolRef.current = 'cursor';
          actions.setTool('cursor');
        }
        return;
      }

      // H for hand tool
      if (event.key === 'h' || event.key === 'H') {
        if (!event.metaKey && !event.ctrlKey) {
          permanentToolRef.current = 'hand';
          actions.setTool('hand');
        }
        return;
      }

      // Space — temporary hand mode
      if (event.code === 'Space' && !event.metaKey && !event.ctrlKey) {
        // Don't activate if typing in input
        if ((event.target as HTMLElement).tagName === 'INPUT' || 
            (event.target as HTMLElement).tagName === 'TEXTAREA') {
          return;
        }
        event.preventDefault();
        setIsSpacePressed(true);
        actions.setTool('hand');
        return;
      }

      // Meta/Cmd — temporary hand mode
      if (event.key === 'Meta') {
        setIsMetaPressed(true);
        actions.setTool('hand');
        return;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Space released
      if (event.code === 'Space') {
        setIsSpacePressed(false);
        // Only restore if Meta is not still pressed
        if (!isMetaPressed) {
          actions.setTool(permanentToolRef.current);
        }
        return;
      }

      // Meta released
      if (event.key === 'Meta') {
        setIsMetaPressed(false);
        // Only restore if Space is not still pressed
        if (!isSpacePressed) {
          actions.setTool(permanentToolRef.current);
        }
        return;
      }
    };

    // Handle window blur (user switches apps while holding modifier)
    const handleBlur = () => {
      setIsSpacePressed(false);
      setIsMetaPressed(false);
      actions.setTool(permanentToolRef.current);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [actions, isSpacePressed, isMetaPressed]);
  
  // Compute if zoom modifier is active (Cmd/Ctrl held for zoom)
  const isZoomModifierActive = isMetaPressed;

  const commandActions: CommandAction[] = React.useMemo(() => [
    { id: 'new-chat', label: 'Create New Chat', perform: actions.createChat, icon: '➕' },
    { id: 'undo', label: 'Undo', perform: actions.undo, icon: '↩️', shortcut: ['⌘', 'Z'] },
    { id: 'redo', label: 'Redo', perform: actions.redo, icon: '↪️', shortcut: ['⌘', '⇧', 'Z'] },
    { id: 'export', label: 'Export Chat to JSON', perform: actions.exportChat, icon: '📤' },
    { id: 'fit-view', label: 'Fit View', perform: actions.centerCanvas, icon: '⤢' },
    { id: 'zoom-in', label: 'Zoom In', perform: () => actions.changeZoom(0.1), icon: '🔍' },
    { id: 'zoom-out', label: 'Zoom Out', perform: () => actions.changeZoom(-0.1), icon: '🔍' },
    { id: 'reset-zoom', label: 'Reset Zoom', perform: actions.resetZoom, icon: '0' },
    { id: 'settings', label: 'Open Settings', perform: () => setIsSettingsOpen(true), icon: '⚙️' },
  ], [actions]);

  return (
    <div className="workspace">
      <CommandPalette
        isOpen={isCmdKOpen}
        onClose={() => setIsCmdKOpen(false)}
        actions={commandActions}
      />
      <Sidebar
        chats={state.chats}
        currentChatId={state.currentChatId}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onCreateChat={actions.createChat}
        onSelectChat={actions.selectChat}
        onDeleteChat={actions.deleteChat}
        isSaving={state.isSaving}
      />
      <div className="workspace-main">
        {state.isLoading && (
          <div className="workspace-loading">
            <Loader2 className="animate-spin text-primary" size={48} />
          </div>
        )}
        <Canvas
          canvasState={state.canvas}
          nodes={state.nodes}
          connections={state.connections}
          onNodePositionChange={actions.updateNodePosition}
          onNodePromptChange={actions.updateNodePrompt}
          onNodeBranchCountChange={actions.updateNodeBranchCount}
          onNodeDeepLevelChange={actions.updateNodeDeepLevel}
          onCanvasPan={actions.panCanvas}
          onZoomAtPoint={actions.zoomAtPoint}
          isZoomModifierActive={isZoomModifierActive}
          onPlayNode={(nodeId: string) =>
            actions.playNode({ nodeId, apiKey, model: state.settings.model })
          }
          onDeleteNode={actions.deleteNode}
          onDuplicateNode={actions.duplicateNode}
          onCenterCanvas={actions.centerCanvas}
          onResetZoom={actions.resetZoom}
        />
        <Toolbar
          tool={state.canvas.tool}
          onToolChange={handleToolChange}
          onCenterCanvas={actions.centerCanvas}
          onUndo={actions.undo}
          onRedo={actions.redo}
          onExport={actions.exportChat}
          onImport={actions.importChat}
          canUndo={state.canUndo}
          canRedo={state.canRedo}
          saveStatus={state.isSaving ? 'saving' : 'saved'}
        />
        <Minimap
          nodes={state.nodes}
          canvasState={state.canvas}
          onNavigate={actions.panCanvas}
          onZoomIn={() => actions.changeZoom(0.1)}
          onZoomOut={() => actions.changeZoom(-0.1)}
          onResetZoom={actions.resetZoom}
        />
        <SettingsPanel
          isOpen={isSettingsOpen}
          apiKey={apiKey}
          isLoaded={isLoaded}
          hasKey={hasKey}
          onChangeKey={updateKey}
          model={state.settings.model}
          onChangeModel={actions.setSettingsModel}
          onClose={() => setIsSettingsOpen(false)}
          onExport={actions.exportChat}
          onImport={actions.importChat}
          onClearData={() => {
            actions.clearData();
            setIsSettingsOpen(false);
          }}
        />
      </div>
    </div>
  );
};
