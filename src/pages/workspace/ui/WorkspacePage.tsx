import React from 'react';
import { Sidebar } from '@/widgets/sidebar/ui/Sidebar';
import { Canvas } from '@/widgets/canvas/ui/Canvas';
import { Toolbar } from '@/widgets/toolbar/ui/Toolbar';
import { SettingsPanel } from '@/widgets/settings-panel/ui/SettingsPanel';
import { useOpenAIKey } from '@/features/manage-openai-key/model/useOpenAIKey';

export const WorkspacePage: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(true);
  const { apiKey, isLoaded, hasKey, updateKey } = useOpenAIKey();

  return (
    <div className="workspace">
      <Sidebar />
      <div className="workspace-main">
        <Canvas />
        <Toolbar onToggleSettings={() => setIsSettingsOpen((v) => !v)} />
        <SettingsPanel
          isOpen={isSettingsOpen}
          apiKey={apiKey}
          isLoaded={isLoaded}
          hasKey={hasKey}
          onChangeKey={updateKey}
        />
      </div>
    </div>
  );
};
