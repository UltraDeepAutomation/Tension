import React from 'react';

export const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">Tension</div>
        <button className="sidebar-new-thread">+ Новый диалог</button>
      </div>
      <div className="sidebar-list">
        <div className="sidebar-placeholder">Диалоги появятся здесь</div>
      </div>
    </aside>
  );
};
