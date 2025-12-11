import React from 'react';
import { WorkspacePage } from '@/pages/workspace/ui/WorkspacePage';
import { ToastProvider } from '@/shared/lib/contexts/ToastContext';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <div className="app-root">
        <WorkspacePage />
      </div>
    </ToastProvider>
  );
};
