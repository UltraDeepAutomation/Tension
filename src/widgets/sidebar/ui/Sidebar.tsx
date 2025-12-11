import React from 'react';
import type { ChatRecord } from '@/shared/db/tensionDb';
import { IconPlus, IconSettings, IconMessage, IconX } from '@/shared/ui/Icons';

interface SidebarProps {
  chats: ChatRecord[];
  currentChatId: string | null;
  onOpenSettings: () => void;
  onCreateChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

const SidebarComponent: React.FC<SidebarProps> = ({
  chats,
  currentChatId,
  onOpenSettings,
  onCreateChat,
  onSelectChat,
  onDeleteChat,
}) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">Tension</div>
        <button className="sidebar-new-thread" onClick={onCreateChat}>
          <IconPlus width={14} height={14} />
          <span>Новый диалог</span>
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
                <div className="sidebar-item-title-row">
                    <IconMessage width={14} height={14} className="sidebar-item-icon" />
                    <div className="sidebar-item-title">{chat.title}</div>
                </div>
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
                <IconX width={14} height={14} />
              </button>
            </div>
          ))
        )}
      </div>
      <button className="sidebar-settings-button" onClick={onOpenSettings}>
        <IconSettings width={14} height={14} />
        <span>Настройки</span>
      </button>
    </aside>
  );
};

export const Sidebar = React.memo(SidebarComponent);
Sidebar.displayName = 'Sidebar';
