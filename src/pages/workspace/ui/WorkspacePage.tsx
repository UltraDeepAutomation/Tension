import React from 'react';
import { Sidebar } from '@/widgets/sidebar/ui/Sidebar';
import { Canvas } from '@/widgets/canvas/ui/Canvas';
import { Toolbar } from '@/widgets/toolbar/ui/Toolbar';
import { SettingsPanel } from '@/widgets/settings-panel/ui/SettingsPanel';
import { useWorkspaceModel } from '@/pages/workspace/model/useWorkspaceModel';
import { useOpenAIKey } from '@/features/manage-openai-key/model/useOpenAIKey';

export const WorkspacePage: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(true);
  const { state, actions } = useWorkspaceModel();
  const { apiKey, isLoaded, hasKey, updateKey } = useOpenAIKey();

  return (
    <div className="workspace">
      <Sidebar />
      <div className="workspace-main">
        <Canvas
          canvasState={state.canvas}
          nodes={state.nodes}
          onNodePositionChange={actions.updateNodePosition}
        />
        <Toolbar
          tool={state.canvas.tool}
          zoom={state.canvas.zoom}
          onToolChange={actions.setTool}
          onZoomIn={() => actions.changeZoom(+0.1)}
          onZoomOut={() => actions.changeZoom(-0.1)}
          onResetZoom={actions.resetZoom}
          onToggleSettings={() => setIsSettingsOpen((v) => !v)}
        />
        <SettingsPanel
          isOpen={isSettingsOpen}
          apiKey={apiKey}
          isLoaded={isLoaded}
          hasKey={hasKey}
          onChangeKey={updateKey}
          model={state.settings.model}
          onChangeModel={actions.setSettingsModel}
        />
      </div>
    </div>
  );
};
