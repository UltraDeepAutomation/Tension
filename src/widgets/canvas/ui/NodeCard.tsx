import React from 'react';
import type { Node } from '@/entities/node/model/types';
import { Play, Loader2 } from 'lucide-react';

interface NodeCardProps {
  node: Node;
  isDragging: boolean;
  isSelected?: boolean;
  onHeaderMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onPromptChange: (prompt: string) => void;
  onBranchCountChange: (count: 1 | 2 | 3 | 4) => void;
  onDeepLevelChange: (level: 1 | 2 | 3 | 4) => void;
  onPlay: () => void;
  onClick?: (e: React.MouseEvent) => void;
}

/** Лимиты строк для коллапсинга */
const CONTEXT_LINES_COLLAPSED = 2;   // Запрос сверху - 2 строки макс
const RESPONSE_LINES_COLLAPSED = 10; // Ответ модели - 10 строк макс
const PROMPT_MIN_ROWS = 2;
const PROMPT_MAX_ROWS = 3;            // Новый запрос - 3 строки макс

const NodeCardComponent: React.FC<NodeCardProps> = ({
  node,
  isDragging,
  isSelected = false,
  onHeaderMouseDown,
  onPromptChange,
  onBranchCountChange,
  onDeepLevelChange,
  onPlay,
  onClick,
}) => {
  const [isContextExpanded, setIsContextExpanded] = React.useState(false);
  const [isResponseExpanded, setIsResponseExpanded] = React.useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = React.useState(false);

  const contextLines = node.context.split('\n').length;
  const responseLines = (node.modelResponse ?? '').split('\n').length;

  const showContextExpand = contextLines > CONTEXT_LINES_COLLAPSED || node.context.length > 150;
  const showResponseExpand = responseLines > RESPONSE_LINES_COLLAPSED || (node.modelResponse?.length ?? 0) > 500;

  // Авто-растущий textarea: 2 строки мин, 5 макс
  const promptLineCount = node.prompt.split('\n').length;
  const calculatedRows = Math.max(PROMPT_MIN_ROWS, Math.min(promptLineCount, PROMPT_MAX_ROWS));
  const promptRows = isPromptExpanded ? 12 : calculatedRows;

  const hasError = Boolean(node.error);

  return (
    <div
      data-node-id={node.id}
      className={`node ${node.isRoot ? 'node--root' : ''} ${isDragging ? 'node--dragging' : ''} ${node.isPlaying ? 'node--loading' : ''} ${hasError ? 'node--error' : ''} ${isSelected ? 'node--selected' : ''}`}
      style={{ left: node.x, top: node.y }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="node-header" onMouseDown={onHeaderMouseDown}>
        <span className="node-title">{node.isRoot ? 'Root' : 'Node'}</span>
        <button
          className={`node-play-button ${node.isPlaying ? 'node-play-button--loading' : ''}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          disabled={node.isPlaying}
          title="Запустить (Enter)"
        >
          {node.isPlaying ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Play size={14} />
          )}
        </button>
      </div>

      {/* Ports */}
      <div className="node-ports node-ports--left">
        <div className="node-port node-port--input" />
      </div>
      <div className="node-ports node-ports--right">
        {Array.from({ length: node.branchCount }).map((_, index) => (
          <div key={index} className="node-port node-port--output" />
        ))}
      </div>

      {/* Body */}
      <div className="node-body">
        {/* 1. Контекст (прошлый запрос) — сверху */}
        {node.context && (
          <div className="node-section node-section--context">
            <div className="node-section-label">Запрос</div>
            <div
              className={`node-section-content ${isContextExpanded ? '' : 'node-section-content--collapsed'}`}
              style={{ ['--max-lines' as string]: CONTEXT_LINES_COLLAPSED }}
            >
              {node.context}
            </div>
            {showContextExpand && (
              <button
                type="button"
                className="node-expand-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsContextExpanded(!isContextExpanded);
                }}
              >
                {isContextExpanded ? 'Свернуть' : 'Развернуть'}
              </button>
            )}
          </div>
        )}

        {/* 2. Ответ модели — по середине */}
        <div className="node-section node-section--response">
          <div className="node-section-label">Ответ</div>
          <div
            className={`node-section-content ${isResponseExpanded ? '' : 'node-section-content--collapsed'}`}
            style={{ ['--max-lines' as string]: RESPONSE_LINES_COLLAPSED }}
          >
            {/* Show loading only if playing AND no response yet */}
            {node.isPlaying && !node.modelResponse ? (
              <div className="node-response-loading">
                <span className="spinner" />
                <span>Модель думает...</span>
              </div>
            ) : (
              node.modelResponse || <span className="node-placeholder">Ответ модели появится здесь</span>
            )}
          </div>
          {node.modelResponse && showResponseExpand && (
            <button
              type="button"
              className="node-expand-button"
              onClick={(e) => {
                e.stopPropagation();
                setIsResponseExpanded(!isResponseExpanded);
              }}
            >
              {isResponseExpanded ? 'Свернуть' : 'Развернуть'}
            </button>
          )}
        </div>

        {/* 3. Новый вопрос — снизу */}
        <div className="node-section node-section--prompt">
          <div className="node-section-label">Новый вопрос</div>
          <textarea
            className={`node-prompt-input ${isPromptExpanded ? 'node-prompt-input--expanded' : ''}`}
            placeholder="Введите ваш вопрос..."
            value={node.prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            rows={promptRows}
          />
          {(promptLineCount > PROMPT_MAX_ROWS || isPromptExpanded) && (
            <button
              type="button"
              className="node-expand-button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPromptExpanded(!isPromptExpanded);
              }}
            >
              {isPromptExpanded ? 'Свернуть' : 'Развернуть'}
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="node-footer">
        <label className="node-branch-label">
          Ветки:
          <select
            value={node.branchCount}
            onChange={(e) => onBranchCountChange(Number(e.target.value) as 1 | 2 | 3 | 4)}
            onClick={(e) => e.stopPropagation()}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </label>
        <label className="node-branch-label">
          Deep:
          <select
            value={node.deepLevel}
            onChange={(e) => onDeepLevelChange(Number(e.target.value) as 1 | 2 | 3 | 4)}
            onClick={(e) => e.stopPropagation()}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </label>
      </div>
    </div>
  );
};

export const NodeCard = React.memo(NodeCardComponent);
NodeCard.displayName = 'NodeCard';
