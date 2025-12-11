import React from 'react';
import { Select } from '@/shared/ui/Select';
import { IconLayers, IconGrid, IconZap } from '@/shared/ui/Icons'; // Using existing icons, might need import or upload more

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
            <Select
              value={model}
              onChange={(val) => onChangeModel(val as string)}
              options={[
                { value: 'gpt-4o', label: 'GPT-4o' },
                { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
                { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
                { value: 'gpt-4.1', label: 'GPT-4.1 (Preview)' }, // Keep user's custom value just in case
              ]}
              className="settings-select"
            />
          </label>
          <p className="settings-hint">
            Ключ хранится локально в IndexedDB этого браузера и не отправляется на сервер.
          </p>
          {!isLoaded && <p className="settings-hint">Загрузка настроек…</p>}
          {isLoaded && hasKey && (
            <p className="settings-hint">Ключ сохранён. Можно использовать Play в нодах.</p>
          )}
          
          <div className="settings-actions-row">
            {onExport && (
              <button className="settings-action-button settings-action-item" onClick={onExport}>
                <span style={{ marginRight: 6 }}>📤</span> Export JSON
              </button>
            )}
            {onImport && (
              <label className="settings-action-button settings-action-item">
                <span style={{ marginRight: 6 }}>📥</span> Import JSON
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
