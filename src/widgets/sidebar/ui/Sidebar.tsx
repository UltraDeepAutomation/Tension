import React from 'react';

interface SidebarProps {
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">Tension</div>
        <button className="sidebar-new-thread">+ Новый диалог</button>
      </div>
      <div className="sidebar-list">
        <div className="sidebar-placeholder">Диалоги появятся здесь</div>
      </div>
      <button className="sidebar-settings-button" onClick={onOpenSettings}>
        Настройки
      </button>
    </aside>
  );
};
