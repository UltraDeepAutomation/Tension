import React from 'react';

interface SettingsPanelProps {
  isOpen: boolean;
  apiKey: string;
  isLoaded: boolean;
  hasKey: boolean;
  onChangeKey: (value: string) => void;
  model: string;
  onChangeModel: (value: string) => void;
  onClose?: () => void;
  onClearData?: () => void;
  onExport?: () => void;
  onImport?: (file: File) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  apiKey,
  isLoaded,
  hasKey,
  onChangeKey,
  model,
  onChangeModel,
  onClose,
  onClearData,
  onExport,
  onImport,
}) => {
  if (!isOpen) return null;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChangeKey(event.target.value);
  };

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeModel(event.target.value);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title">Настройки</div>
          {onClose && (
            <button className="settings-close" onClick={onClose}>
              ×
            </button>
          )}
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
            <select value={model} onChange={handleModelChange}>
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
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', width: '100%' }}>
            {onExport && (
              <button className="settings-action-button" onClick={onExport} style={{ flex: 1 }}>
                Export JSON
              </button>
            )}
            {onImport && (
              <label className="settings-action-button" style={{ flex: 1 }}>
                Import JSON
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImport(file);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            )}
          </div>

          {onClearData && (
            <button
              type="button"
              className="settings-clear-button"
              onClick={onClearData}
            >
              Сбросить все ноды
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
