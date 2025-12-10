import React from 'react';
import { Sidebar } from '@/widgets/sidebar/ui/Sidebar';
import { Canvas } from '@/widgets/canvas/ui/Canvas';
import { Toolbar } from '@/widgets/toolbar/ui/Toolbar';
import { SettingsPanel } from '@/widgets/settings-panel/ui/SettingsPanel';
import { useWorkspaceModel } from '@/pages/workspace/model/useWorkspaceModel';

export const WorkspacePage: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(true);
  const { state, actions } = useWorkspaceModel();

  return (
    <div className="workspace">
      <Sidebar />
      <div className="workspace-main">
        <Canvas canvasState={state.canvas} />
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
          apiKey={state.settings.openAIApiKey}
          isLoaded={true}
          hasKey={Boolean(state.settings.openAIApiKey)}
          onChangeKey={actions.setOpenAIApiKey}
          model={state.settings.model}
          onChangeModel={actions.setSettingsModel}
        />
      </div>
    </div>
  );
};
