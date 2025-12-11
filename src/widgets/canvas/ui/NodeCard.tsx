import React from 'react';
import type { Node } from '@/entities/node/model/types';

interface NodeCardProps {
  node: Node;
  isDragging: boolean;
  onHeaderMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onPromptChange: (prompt: string) => void;
  onBranchCountChange: (count: 1 | 2 | 3 | 4) => void;
  onDeepLevelChange: (level: 1 | 2 | 3 | 4) => void;
  onPlay: () => void;
  onDelete: () => void;
}

/** Лимиты строк для коллапсинга */
const CONTEXT_LINES_COLLAPSED = 3;
const RESPONSE_LINES_COLLAPSED = 15;
const PROMPT_MIN_ROWS = 2;
const PROMPT_MAX_ROWS = 5;

export const NodeCard: React.FC<NodeCardProps> = React.memo(({
  node,
  isDragging,
  onHeaderMouseDown,
  onPromptChange,
  onBranchCountChange,
  onDeepLevelChange,
  onPlay,
  onDelete,
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
      className={`node ${node.isRoot ? 'node--root' : ''} ${isDragging ? 'node--dragging' : ''} ${node.isPlaying ? 'node--loading' : ''} ${hasError ? 'node--error' : ''}`}
      style={{ left: node.x, top: node.y }}
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
        >
          {node.isPlaying ? <span className="spinner spinner--sm" /> : '▶'}
        </button>
        {!node.isRoot && (
          <button
            className="node-delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Удалить ветку"
          >
            ×
          </button>
        )}
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
            {node.isPlaying ? (
              <div className="node-response-loading">
                <span className="spinner" />
                <span>Модель думает...</span>
              </div>
            ) : (
              node.modelResponse || <span className="node-placeholder">Ответ модели появится здесь</span>
            )}
          </div>
          {!node.isPlaying && node.modelResponse && showResponseExpand && (
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
});
