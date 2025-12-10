import React from 'react';

interface SettingsPanelProps {
  isOpen: boolean;
  apiKey: string;
  isLoaded: boolean;
  hasKey: boolean;
  onChangeKey: (value: string) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  apiKey,
  isLoaded,
  hasKey,
  onChangeKey,
}) => {
  if (!isOpen) return null;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChangeKey(event.target.value);
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <div className="settings-title">Настройки</div>
      </div>
      <div className="settings-body">
        <label className="settings-field">
          <span>OpenAI API Key</span>
          <input
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={handleChange}
            disabled={!isLoaded}
          />
        </label>
        <label className="settings-field">
          <span>Модель</span>
          <select defaultValue="gpt-4.1">
            <option value="gpt-4.1">gpt-4.1</option>
            <option value="gpt-4.1-mini">gpt-4.1-mini</option>
          </select>
        </label>
        <p className="settings-hint">
          Ключ хранится локально в IndexedDB этого браузера и не отправляется на сервер.
        </p>
        {!isLoaded && <p className="settings-hint">Загрузка настроек…</p>}
        {isLoaded && hasKey && (
          <p className="settings-hint">Ключ сохранён. Можно использовать Play в нодах.</p>
        )}
      </div>
    </div>
  );
};
