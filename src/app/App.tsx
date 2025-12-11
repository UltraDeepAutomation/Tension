import React from 'react';
import { WorkspacePage } from '@/pages/workspace/ui/WorkspacePage';
import { ToastProvider } from '@/shared/lib/contexts/ToastContext';
import { ThemeProvider } from '@/shared/lib/contexts/ThemeContext';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="app-root">
          <WorkspacePage />
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
};
