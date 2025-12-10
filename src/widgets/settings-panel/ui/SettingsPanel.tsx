import React from 'react';

interface SettingsPanelProps {
  isOpen: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen }) => {
  if (!isOpen) return null;

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <div className="settings-title">Настройки</div>
      </div>
      <div className="settings-body">
        <label className="settings-field">
          <span>OpenAI API Key</span>
          <input type="password" placeholder="sk-..." />
        </label>
        <label className="settings-field">
          <span>Модель</span>
          <select defaultValue="gpt-4.1">
            <option value="gpt-4.1">gpt-4.1</option>
            <option value="gpt-4.1-mini">gpt-4.1-mini</option>
          </select>
        </label>
        <p className="settings-hint">
          Ключ будет храниться локально в браузере (localStorage) на следующем шаге.
        </p>
      </div>
    </div>
  );
};
