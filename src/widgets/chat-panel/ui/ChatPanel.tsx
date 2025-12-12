import React from 'react';
import { Send, X, MessageSquare, Bot, User, ChevronDown, ChevronUp } from 'lucide-react';
import { MarkdownRenderer } from '@/shared/ui/MarkdownRenderer';
import type { ProviderId } from '@/entities/node/model/types';
import type { Council } from '@/entities/council/model/types';
import type { CouncilPlan, CouncilBranch } from '@/pages/workspace/model/useWorkspaceModel';

/** Сообщение в чате */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  providerId?: ProviderId;
  modelId?: string;
  nodeId?: string; // Связь с нодой на канвасе
  agentName?: string; // Имя агента в Council
  confidence?: number;
}

/** Шаг размышления Council */
export interface ThinkingStep {
  id: string;
  stage: 'divergence' | 'convergence' | 'synthesis';
  agentId: string;
  agentName: string;
  providerId: ProviderId;
  modelId: string;
  input: string;
  output: string;
  timestamp: number;
  duration?: number;
  nodeId?: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  thinkingSteps: ThinkingStep[];
  onSendMessage: (message: string) => void;
  onNavigateToNode?: (nodeId: string) => void;
  isThinking?: boolean;
  councils: Council[];
  selectedCouncilId: string | null;
  onSelectCouncil: (councilId: string | null) => void;
  maxDepth: number;
  onChangeMaxDepth: (value: number) => void;
  onStartPlan?: (rootNodeId: string, maxDepth: number) => void;
  rootNodeId: string | null;
  councilPlan?: CouncilPlan | null;
}

const PROVIDER_ICONS: Record<ProviderId, string> = {
  openai: '🟢',
  anthropic: '🟠',
  google: '🔵',
  openrouter: '🟣',
  xai: '⚫',
  ollama: '🦙',
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  messages,
  thinkingSteps,
  onSendMessage,
  onNavigateToNode,
  isThinking = false,
  councils,
  selectedCouncilId,
  onSelectCouncil,
  maxDepth,
  onChangeMaxDepth,
  onStartPlan,
  rootNodeId,
  councilPlan,
}) => {
  const [input, setInput] = React.useState('');
  const [showThinking, setShowThinking] = React.useState(true);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const groupedWaves = React.useMemo(() => {
    if (!councilPlan) return [];
    const map = new Map<number, CouncilBranch[]>();
    councilPlan.branches.forEach((branch) => {
      const bucket = map.get(branch.wave);
      if (bucket) {
        bucket.push(branch);
      } else {
        map.set(branch.wave, [branch]);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([wave, branches]) => ({ wave, branches }));
  }, [councilPlan]);

  const startDisabledReason = React.useMemo(() => {
    if (!onStartPlan) return 'Автоплан пока недоступен';
    if (!selectedCouncilId) return 'Выберите council';
    if (!rootNodeId) return 'Не найдена корневая нода';
    return null;
  }, [onStartPlan, selectedCouncilId, rootNodeId]);
  const isStartDisabled = !!startDisabledReason;

  // Auto-scroll to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinkingSteps]);

  // Focus input when opened
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStageLabel = (stage: ThinkingStep['stage']) => {
    switch (stage) {
      case 'divergence': return 'Расхождение';
      case 'convergence': return 'Схождение';
      case 'synthesis': return 'Синтез';
    }
  };

  const getStageColor = (stage: ThinkingStep['stage']) => {
    switch (stage) {
      case 'divergence': return 'var(--color-warning)';
      case 'convergence': return 'var(--color-info)';
      case 'synthesis': return 'var(--color-success)';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <div className="chat-panel-title">
          <MessageSquare size={18} />
          <span>Чат с Council</span>
        </div>
        <button className="chat-panel-close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="chat-panel-content">
        <div className="chat-panel-council-settings">
          <div className="chat-panel-council-row">
            <label className="chat-panel-label">Council</label>
            <select
              className="chat-panel-select"
              value={selectedCouncilId ?? ''}
              onChange={(e) => onSelectCouncil(e.target.value || null)}
            >
              <option value="">Не выбран</option>
              {councils.map((council) => (
                <option key={council.id} value={council.id}>
                  {council.icon} {council.name}
                </option>
              ))}
            </select>
          </div>
          <div className="chat-panel-council-row">
            <label className="chat-panel-label">Глубина</label>
            <input
              type="number"
              min={1}
              max={6}
              value={maxDepth}
              onChange={(e) => onChangeMaxDepth(Number(e.target.value))}
              className="chat-panel-input"
            />
          </div>
          <div className="chat-panel-council-actions">
            <button
              className="chat-panel-button"
              disabled={isStartDisabled}
              onClick={() => rootNodeId && onStartPlan?.(rootNodeId, maxDepth)}
              title={startDisabledReason || undefined}
            >
              Запустить план
            </button>
            {isStartDisabled && (
              <span className="chat-panel-hint">{startDisabledReason}</span>
            )}
          </div>
        </div>

        {councilPlan && councilPlan.branches.length > 0 && (
          <div className="chat-panel-plan">
            <div className="chat-panel-plan-header">
              План совета · Глубина {councilPlan.maxDepth} · Волн: {councilPlan.waves}
            </div>
            <div className="chat-panel-plan-waves">
              {groupedWaves.map(({ wave, branches }) => (
                <div key={wave} className="chat-panel-plan-wave">
                  <div className="chat-panel-plan-wave-title">Волна {wave + 1}</div>
                  <div className="chat-panel-plan-branches">
                    {branches.map((branch) => (
                      <div key={branch.id} className="chat-panel-plan-branch">
                        <span className="chat-panel-plan-dot" data-status={branch.status} />
                        <span className="chat-panel-plan-model">
                          {PROVIDER_ICONS[branch.providerId]} {branch.modelId}
                        </span>
                        <span className="chat-panel-plan-status">
                          {branch.status}
                          {branch.error ? ` · ${branch.error}` : ''}
                        </span>
                        {branch.nodeId && onNavigateToNode && (
                          <button
                            className="chat-panel-plan-link"
                            onClick={() => onNavigateToNode(branch.nodeId!)}
                          >
                            Нода →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {(!councilPlan || councilPlan.branches.length === 0) && (
          <div className="chat-panel-plan-empty">
            План ещё не создан. Запустите council для автоматической оркестрации.
          </div>
        )}

        {/* Thinking Steps Section */}
        {thinkingSteps.length > 0 && (
          <div className="chat-panel-thinking">
            <button 
              className="chat-panel-thinking-toggle"
              onClick={() => setShowThinking(!showThinking)}
            >
              <span>Процесс размышления ({thinkingSteps.length} шагов)</span>
              {showThinking ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {showThinking && (
              <div className="chat-panel-thinking-steps">
                {(['divergence', 'convergence', 'synthesis'] as const).map((stageKey) => {
                  const stepsByStage = thinkingSteps.filter((s) => s.stage === stageKey);
                  if (stepsByStage.length === 0) return null;
                  return (
                    <div key={stageKey} className="thinking-stage-group">
                      <div
                        className="thinking-stage-header"
                        style={{ '--stage-color': getStageColor(stageKey) } as React.CSSProperties}
                      >
                        {getStageLabel(stageKey)} · {stepsByStage.length}
                      </div>
                      {stepsByStage.map((step) => (
                        <div 
                          key={step.id} 
                          className="thinking-step"
                          style={{ '--stage-color': getStageColor(step.stage) } as React.CSSProperties}
                        >
                          <div className="thinking-step-header">
                            <span className="thinking-step-stage">{getStageLabel(step.stage)}</span>
                            <span className="thinking-step-agent">
                              {PROVIDER_ICONS[step.providerId]} {step.agentName}
                            </span>
                            <span className="thinking-step-time">{formatTime(step.timestamp)}</span>
                          </div>
                          <div className="thinking-step-content">
                            <MarkdownRenderer content={step.output} />
                          </div>
                          {step.duration && (
                            <div className="thinking-step-duration">
                              {(step.duration / 1000).toFixed(1)}s
                            </div>
                          )}
                          {step.nodeId && onNavigateToNode && (
                            <button
                              className="chat-message-node-link"
                              onClick={() => onNavigateToNode(step.nodeId!)}
                            >
                              Показать на канвасе →
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="chat-panel-messages">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`chat-message chat-message--${message.role}`}
            >
              <div className="chat-message-avatar">
                {message.role === 'user' ? (
                  <User size={16} />
                ) : (
                  <Bot size={16} />
                )}
              </div>
              <div className="chat-message-content">
                <div className="chat-message-header">
                  <span className="chat-message-name">
                    {message.role === 'user' ? 'Вы' : message.agentName || 'Council'}
                  </span>
                  {message.providerId && (
                    <span className="chat-message-provider">
                      {PROVIDER_ICONS[message.providerId]} {message.modelId}
                    </span>
                  )}
                  <span className="chat-message-time">{formatTime(message.timestamp)}</span>
                </div>
                <div className="chat-message-body">
                  <MarkdownRenderer content={message.content} />
                </div>
                {message.nodeId && onNavigateToNode && (
                  <button 
                    className="chat-message-node-link"
                    onClick={() => onNavigateToNode(message.nodeId!)}
                  >
                    Показать на канвасе →
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {isThinking && (
            <div className="chat-message chat-message--assistant chat-message--thinking">
              <div className="chat-message-avatar">
                <Bot size={16} />
              </div>
              <div className="chat-message-content">
                <div className="chat-thinking-indicator">
                  <span className="chat-thinking-dot" />
                  <span className="chat-thinking-dot" />
                  <span className="chat-thinking-dot" />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <form className="chat-panel-input-area" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className="chat-panel-input"
          placeholder="Задайте вопрос Council..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isThinking}
        />
        <button 
          type="submit" 
          className="chat-panel-send"
          disabled={!input.trim() || isThinking}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
