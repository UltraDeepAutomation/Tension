import React from 'react';
import type { ChatRecord } from '@/shared/db/tensionDb';

interface SidebarProps {
  chats: ChatRecord[];
  currentChatId: string | null;
  onOpenSettings: () => void;
  onCreateChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  isSaving?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  currentChatId,
  onOpenSettings,
  onCreateChat,
  onSelectChat,
  onDeleteChat,
  isSaving,
}) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          Tension
          {isSaving && <span className="saving-badge">Saving...</span>}
        </div>
        <button className="sidebar-new-thread" onClick={onCreateChat}>
          + Новый диалог
        </button>
      </div>
      <div className="sidebar-list">
        {chats.length === 0 ? (
          <div className="sidebar-placeholder">Нет диалогов</div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              className={`sidebar-item ${chat.id === currentChatId ? 'sidebar-item--active' : ''}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="sidebar-item-content">
                <div className="sidebar-item-title">{chat.title}</div>
                <div className="sidebar-item-date">
                  {new Date(chat.updatedAt).toLocaleString()}
                </div>
              </div>
              <button
                className="sidebar-item-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                title="Удалить"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
      <button className="sidebar-settings-button" onClick={onOpenSettings}>
        Настройки
      </button>
    </aside>
  );
};
