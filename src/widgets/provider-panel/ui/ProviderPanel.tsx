import React from 'react';
import { Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { ProviderId, ProviderConfig } from '@/shared/lib/llm/types';
import { PROVIDER_INFO, getModelsByProvider } from '@/shared/lib/llm/models';

interface ProviderPanelProps {
  providers: ProviderConfig[];
  onUpdateProvider: (config: ProviderConfig) => void;
  onTestProvider: (providerId: ProviderId) => Promise<boolean>;
}

interface ProviderCardProps {
  config: ProviderConfig;
  onUpdate: (config: ProviderConfig) => void;
  onTest: () => Promise<boolean>;
}

const ProviderCard: React.FC<ProviderCardProps> = ({ config, onUpdate, onTest }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<boolean | null>(null);
  const [apiKey, setApiKey] = React.useState(config.apiKey);
  
  const info = PROVIDER_INFO[config.id];
  const models = getModelsByProvider(config.id);
  const hasKey = apiKey.length > 0;
  
  const handleSaveKey = () => {
    onUpdate({ ...config, apiKey, isEnabled: apiKey.length > 0 });
    setTestResult(null);
  };
  
  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await onTest();
      setTestResult(result);
    } catch {
      setTestResult(false);
    } finally {
      setIsTesting(false);
    }
  };
  
  const getStatusIcon = () => {
    if (isTesting) return <Loader2 size={16} className="animate-spin provider-status-icon--testing" />;
    if (testResult === true) return <Check size={16} className="provider-status-icon--success" />;
    if (testResult === false) return <X size={16} className="provider-status-icon--error" />;
    if (hasKey) return <Check size={16} className="provider-status-icon--configured" />;
    return <div className="provider-status-icon--empty" />;
  };
  
  const getStatusText = () => {
    if (isTesting) return 'Проверка...';
    if (testResult === true) return 'Подключен';
    if (testResult === false) return 'Ошибка подключения';
    if (hasKey) return 'Настроен';
    return 'Не настроен';
  };
  
  return (
    <div className={`provider-card ${hasKey ? 'provider-card--configured' : ''}`}>
      <div 
        className="provider-card-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="provider-card-info">
          <span className="provider-card-icon">{info.icon}</span>
          <div className="provider-card-details">
            <span className="provider-card-name">{info.name}</span>
            <span className="provider-card-models">
              {models.slice(0, 3).map(m => m.name).join(', ')}
              {models.length > 3 && ` +${models.length - 3}`}
            </span>
          </div>
        </div>
        <div className="provider-card-status">
          {getStatusIcon()}
          <span className="provider-card-status-text">{getStatusText()}</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="provider-card-body">
          <label className="provider-field">
            <span>API Key</span>
            <input
              type="password"
              placeholder={config.id === 'ollama' ? 'Не требуется' : 'Введите API ключ...'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={config.id === 'ollama'}
            />
          </label>
          
          {config.id !== 'ollama' && (
            <p className="provider-hint">
              {config.id === 'openai' && 'Получите ключ на platform.openai.com'}
              {config.id === 'anthropic' && 'Получите ключ на console.anthropic.com'}
              {config.id === 'google' && 'Получите ключ на aistudio.google.com'}
              {config.id === 'openrouter' && 'Получите ключ на openrouter.ai — доступ ко всем моделям'}
              {config.id === 'xai' && 'Получите ключ на x.ai'}
            </p>
          )}
          
          {config.id === 'ollama' && (
            <p className="provider-hint">
              Ollama работает локально. Убедитесь, что Ollama запущен на localhost:11434
            </p>
          )}
          
          <div className="provider-actions">
            <button 
              className="provider-button provider-button--secondary"
              onClick={handleTest}
              disabled={isTesting || (!hasKey && config.id !== 'ollama')}
            >
              {isTesting ? <Loader2 size={14} className="animate-spin" /> : 'Проверить'}
            </button>
            <button 
              className="provider-button provider-button--primary"
              onClick={handleSaveKey}
              disabled={apiKey === config.apiKey}
            >
              Сохранить
            </button>
          </div>
          
          <div className="provider-models">
            <span className="provider-models-title">Доступные модели:</span>
            <div className="provider-models-list">
              {models.map(m => (
                <span key={m.id} className="provider-model-tag">
                  {m.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ProviderPanel: React.FC<ProviderPanelProps> = ({
  providers,
  onUpdateProvider,
  onTestProvider,
}) => {
  const providerOrder: ProviderId[] = ['openai', 'anthropic', 'google', 'openrouter', 'xai', 'ollama'];
  
  const sortedProviders = providerOrder.map(id => 
    providers.find(p => p.id === id) ?? {
      id,
      name: PROVIDER_INFO[id].name,
      apiKey: '',
      isEnabled: false,
    }
  );
  
  return (
    <div className="provider-panel">
      <p className="provider-panel-intro">
        Настройте API ключи для подключения к различным LLM провайдерам.
      </p>
      
      <div className="provider-list">
        {sortedProviders.map(config => (
          <ProviderCard
            key={config.id}
            config={config}
            onUpdate={onUpdateProvider}
            onTest={() => onTestProvider(config.id)}
          />
        ))}
      </div>
      
      <div className="provider-security-note">
        🔒 Все ключи хранятся локально в вашем браузере и никогда не отправляются на наши серверы.
      </div>
    </div>
  );
};
