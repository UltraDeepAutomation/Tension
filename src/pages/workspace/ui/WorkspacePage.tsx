import React from 'react';
import { Sidebar } from '@/widgets/sidebar/ui/Sidebar';
import { Canvas } from '@/widgets/canvas/ui/Canvas';
import { Toolbar } from '@/widgets/toolbar/ui/Toolbar';
import { SettingsPanel } from '@/widgets/settings-panel/ui/SettingsPanel';

export const WorkspacePage: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(true);

  return (
    <div className="workspace">
      <Sidebar />
      <div className="workspace-main">
        <Canvas />
        <Toolbar onToggleSettings={() => setIsSettingsOpen((v) => !v)} />
        <SettingsPanel isOpen={isSettingsOpen} />
      </div>
    </div>
  );
};
