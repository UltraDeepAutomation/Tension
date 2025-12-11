import React from 'react';
import { Select } from '@/shared/ui/Select';
import { useTheme } from '@/shared/lib/contexts/ThemeContext';
import { Sun, Moon, Settings, Key, Database, Palette, X } from 'lucide-react';
import { ProviderPanel } from '@/widgets/provider-panel';
import type { ProviderId, ProviderConfig } from '@/shared/lib/llm/types';

type SettingsSection = 'general' | 'providers' | 'data';

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
  providers?: ProviderConfig[];
  onUpdateProvider?: (config: ProviderConfig) => void;
  onTestProvider?: (providerId: ProviderId) => Promise<boolean>;
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
  providers,
  onUpdateProvider,
  onTestProvider,
}) => {
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = React.useState<SettingsSection>('general');
  
  if (!isOpen) return null;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChangeKey(event.target.value);
  };
  
  const hasMultiProvider = providers && onUpdateProvider && onTestProvider;

  const sections: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'Основные', icon: <Settings size={18} /> },
    { id: 'providers', label: 'API Провайдеры', icon: <Key size={18} /> },
    { id: 'data', label: 'Данные', icon: <Database size={18} /> },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Sidebar */}
        <div className="settings-sidebar">
          <div className="settings-sidebar-header">
            <Settings size={20} />
            <span>Настройки</span>
          </div>
          <nav className="settings-nav">
            {sections.map((section) => (
              <button
                key={section.id}
                className={`settings-nav-item ${activeSection === section.id ? 'settings-nav-item--active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.icon}
                <span>{section.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        {/* Content */}
        <div className="settings-content">
          <div className="settings-content-header">
            <h2 className="settings-content-title">
              {sections.find(s => s.id === activeSection)?.label}
            </h2>
            {onClose && (
              <button className="settings-close-btn" onClick={onClose}>
                <X size={20} />
              </button>
            )}
          </div>
          
          <div className="settings-content-body">
            {/* General Section */}
            {activeSection === 'general' && (
              <div className="settings-section">
                <div className="settings-group">
                  <h3 className="settings-group-title">
                    <Palette size={16} />
                    Внешний вид
                  </h3>
                  <div className="settings-field-row">
                    <span className="settings-field-label">Тема оформления</span>
                    <div className="settings-theme-toggle">
                      <button
                        className={`settings-theme-btn ${theme === 'light' ? 'settings-theme-btn--active' : ''}`}
                        onClick={() => setTheme('light')}
                      >
                        <Sun size={16} />
                        <span>Светлая</span>
                      </button>
                      <button
                        className={`settings-theme-btn ${theme === 'dark' ? 'settings-theme-btn--active' : ''}`}
                        onClick={() => setTheme('dark')}
                      >
                        <Moon size={16} />
                        <span>Тёмная</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Legacy model selection */}
                <div className="settings-group">
                  <h3 className="settings-group-title">
                    <Settings size={16} />
                    Модель по умолчанию
                  </h3>
                  <div className="settings-field-row">
                    <span className="settings-field-label">Модель</span>
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
                  </div>
                </div>
              </div>
            )}
            
            {/* Providers Section */}
            {activeSection === 'providers' && (
              <div className="settings-section">
                {hasMultiProvider ? (
                  <ProviderPanel
                    providers={providers}
                    onUpdateProvider={onUpdateProvider}
                    onTestProvider={onTestProvider}
                  />
                ) : (
                  <div className="settings-group">
                    <h3 className="settings-group-title">
                      <Key size={16} />
                      OpenAI API
                    </h3>
                    <div className="settings-field-column">
                      <label className="settings-field-label">API Key</label>
                      <input
                        type="password"
                        className="settings-input"
                        placeholder="sk-..."
                        value={apiKey}
                        onChange={handleChange}
                        disabled={!isLoaded}
                      />
                      <p className="settings-hint">
                        Ключ хранится локально в IndexedDB и не отправляется на сервер.
                      </p>
                      {!isLoaded && <p className="settings-hint">Загрузка настроек…</p>}
                      {isLoaded && hasKey && (
                        <p className="settings-hint settings-hint--success">✓ Ключ сохранён</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Data Section */}
            {activeSection === 'data' && (
              <div className="settings-section">
                <div className="settings-group">
                  <h3 className="settings-group-title">
                    <Database size={16} />
                    Экспорт / Импорт
                  </h3>
                  <p className="settings-group-desc">
                    Экспортируйте ваши чаты в JSON файл или импортируйте из резервной копии.
                  </p>
                  <div className="settings-actions-row">
                    {onExport && (
                      <button className="settings-action-btn" onClick={onExport}>
                        📤 Экспорт
                      </button>
                    )}
                    {onImport && (
                      <label className="settings-action-btn">
                        📥 Импорт
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
                </div>
                
                <div className="settings-group settings-group--danger">
                  <h3 className="settings-group-title">⚠️ Опасная зона</h3>
                  <p className="settings-group-desc">
                    Это действие удалит все ваши чаты, настройки и API ключи. Отменить невозможно.
                  </p>
                  {onClearData && (
                    <button
                      type="button"
                      className="settings-danger-btn"
                      onClick={onClearData}
                    >
                      Сбросить все данные
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
