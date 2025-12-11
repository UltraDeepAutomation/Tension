import React from 'react';
import { Sidebar } from '@/widgets/sidebar/ui/Sidebar';
import { Canvas } from '@/widgets/canvas/ui/Canvas';
import { Toolbar } from '@/widgets/toolbar/ui/Toolbar';
import { SettingsPanel } from '@/widgets/settings-panel/ui/SettingsPanel';
import { useWorkspaceModel } from '@/pages/workspace/model/useWorkspaceModel';
import { useOpenAIKey } from '@/features/manage-openai-key/model/useOpenAIKey';
import { CommandPalette, CommandAction } from '@/widgets/command-palette/ui/CommandPalette';
import { Minimap } from '@/widgets/minimap/ui/Minimap';

export const WorkspacePage: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isCmdKOpen, setIsCmdKOpen] = React.useState(false);
  const { state, actions } = useWorkspaceModel();
  const { apiKey, isLoaded, hasKey, updateKey } = useOpenAIKey();
  const [isZoomModifierActive, setIsZoomModifierActive] = React.useState(false);
  const baseToolRef = React.useRef(state.canvas.tool);

  React.useEffect(() => {
    baseToolRef.current = state.canvas.tool;
  }, [state.canvas.tool]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsCmdKOpen((prev) => !prev);
        return;
      }

      if (event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar' || event.key === 'Meta') {
        setIsZoomModifierActive(true);
        actions.setTool('hand');
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar' || event.key === 'Meta') {
        setIsZoomModifierActive(false);
        actions.setTool(baseToolRef.current === 'hand' ? 'cursor' : baseToolRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [actions]);

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
          zoom={state.canvas.zoom}
          onToolChange={actions.setTool}
          onZoomIn={() => actions.changeZoom(+0.1)}
          onZoomOut={() => actions.changeZoom(-0.1)}
          onResetZoom={actions.resetZoom}
          onCenterCanvas={actions.centerCanvas}
        />
        <Minimap
          nodes={state.nodes}
          canvasState={state.canvas}
          onNavigate={actions.panCanvas}
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
