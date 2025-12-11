import React from 'react';
import { Select } from '@/shared/ui/Select';
import { useTheme } from '@/shared/lib/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

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
  const { theme, setTheme } = useTheme();
  
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
          {/* Theme Toggle */}
          <div className="settings-field">
            <span>Тема оформления</span>
            <div className="settings-theme-toggle">
              <button
                className={`settings-theme-button ${theme === 'light' ? 'settings-theme-button--active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <Sun size={16} />
                <span>Светлая</span>
              </button>
              <button
                className={`settings-theme-button ${theme === 'dark' ? 'settings-theme-button--active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <Moon size={16} />
                <span>Тёмная</span>
              </button>
            </div>
          </div>

          <div className="settings-divider" />

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
                { value: 'gpt-4.1', label: 'GPT-4.1 (Preview)' },
              ]}
              className="settings-select"
            />
          </label>
          <p className="settings-hint">
            Ключ хранится локально в IndexedDB этого браузера и не отправляется на сервер.
          </p>
          {!isLoaded && <p className="settings-hint">Загрузка настроек…</p>}
          {isLoaded && hasKey && (
            <p className="settings-hint settings-hint--success">✓ Ключ сохранён</p>
          )}
          
          <div className="settings-divider" />
          
          <div className="settings-actions-row">
            {onExport && (
              <button className="settings-action-button" onClick={onExport}>
                📤 Export
              </button>
            )}
            {onImport && (
              <label className="settings-action-button">
                📥 Import
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
              Сбросить все данные
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
