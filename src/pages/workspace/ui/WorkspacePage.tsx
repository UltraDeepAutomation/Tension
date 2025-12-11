import React from 'react';
import { Sidebar } from '@/widgets/sidebar/ui/Sidebar';
import { Canvas } from '@/widgets/canvas/ui/Canvas';
import { Toolbar } from '@/widgets/toolbar/ui/Toolbar';
import { SettingsPanel } from '@/widgets/settings-panel/ui/SettingsPanel';
import { useWorkspaceModel } from '@/pages/workspace/model/useWorkspaceModel';
import { useOpenAIKey } from '@/features/manage-openai-key/model/useOpenAIKey';

export const WorkspacePage: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
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

  return (
    <div className="workspace">
      <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />
      <div className="workspace-main">
        <Canvas
          canvasState={state.canvas}
          nodes={state.nodes}
          connections={state.connections}
          onNodePositionChange={actions.updateNodePosition}
          onCanvasPan={actions.panCanvas}
          onZoomAtPoint={actions.zoomAtPoint}
          isZoomModifierActive={isZoomModifierActive}
          onPlayNode={(nodeId: string) =>
            actions.playNode({ nodeId, apiKey, model: state.settings.model })
          }
        />
        <Toolbar
          tool={state.canvas.tool}
          zoom={state.canvas.zoom}
          onToolChange={actions.setTool}
          onZoomIn={() => actions.changeZoom(+0.1)}
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
          onClearData={() => {
            actions.clearData();
            setIsSettingsOpen(false);
          }}
        />
      </div>
    </div>
  );
};
