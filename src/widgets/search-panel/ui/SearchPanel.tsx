import React from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import type { Node } from '@/entities/node/model/types';

interface SearchResult {
  nodeId: string;
  field: 'prompt' | 'context' | 'modelResponse';
  matchStart: number;
  matchEnd: number;
  preview: string;
}

interface SearchPanelProps {
  nodes: Node[];
  isOpen: boolean;
  onClose: () => void;
  onNavigateToNode: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  nodes,
  isOpen,
  onClose,
  onNavigateToNode,
  onSelectNode,
}) => {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input when opened
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search logic
  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setCurrentIndex(0);
      return;
    }

    const searchQuery = query.toLowerCase();
    const newResults: SearchResult[] = [];

    nodes.forEach(node => {
      // Search in prompt
      const promptLower = node.prompt.toLowerCase();
      const promptIndex = promptLower.indexOf(searchQuery);
      if (promptIndex !== -1) {
        newResults.push({
          nodeId: node.id,
          field: 'prompt',
          matchStart: promptIndex,
          matchEnd: promptIndex + query.length,
          preview: getPreview(node.prompt, promptIndex, query.length),
        });
      }

      // Search in context
      const contextLower = node.context.toLowerCase();
      const contextIndex = contextLower.indexOf(searchQuery);
      if (contextIndex !== -1) {
        newResults.push({
          nodeId: node.id,
          field: 'context',
          matchStart: contextIndex,
          matchEnd: contextIndex + query.length,
          preview: getPreview(node.context, contextIndex, query.length),
        });
      }

      // Search in modelResponse
      if (node.modelResponse) {
        const responseLower = node.modelResponse.toLowerCase();
        const responseIndex = responseLower.indexOf(searchQuery);
        if (responseIndex !== -1) {
          newResults.push({
            nodeId: node.id,
            field: 'modelResponse',
            matchStart: responseIndex,
            matchEnd: responseIndex + query.length,
            preview: getPreview(node.modelResponse, responseIndex, query.length),
          });
        }
      }
    });

    setResults(newResults);
    setCurrentIndex(0);
  }, [query, nodes]);

  // Navigate to current result
  React.useEffect(() => {
    if (results.length > 0 && results[currentIndex]) {
      const result = results[currentIndex];
      onNavigateToNode(result.nodeId);
      onSelectNode(result.nodeId);
    }
  }, [currentIndex, results, onNavigateToNode, onSelectNode]);

  const getPreview = (text: string, matchIndex: number, matchLength: number): string => {
    const contextChars = 30;
    const start = Math.max(0, matchIndex - contextChars);
    const end = Math.min(text.length, matchIndex + matchLength + contextChars);
    
    let preview = text.slice(start, end);
    if (start > 0) preview = '...' + preview;
    if (end < text.length) preview = preview + '...';
    
    return preview;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Previous result
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
      } else {
        // Next result
        setCurrentIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
      }
    }
  };

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
  };

  const getFieldLabel = (field: SearchResult['field']): string => {
    switch (field) {
      case 'prompt': return 'Запрос';
      case 'context': return 'Контекст';
      case 'modelResponse': return 'Ответ';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="search-panel">
      <div className="search-panel-input-wrapper">
        <Search size={16} className="search-panel-icon" />
        <input
          ref={inputRef}
          type="text"
          className="search-panel-input"
          placeholder="Поиск по нодам..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {results.length > 0 && (
          <span className="search-panel-count">
            {currentIndex + 1} / {results.length}
          </span>
        )}
        <div className="search-panel-nav">
          <button
            className="search-panel-nav-btn"
            onClick={goToPrevious}
            disabled={results.length === 0}
            title="Предыдущий (Shift+Enter)"
          >
            <ChevronUp size={16} />
          </button>
          <button
            className="search-panel-nav-btn"
            onClick={goToNext}
            disabled={results.length === 0}
            title="Следующий (Enter)"
          >
            <ChevronDown size={16} />
          </button>
        </div>
        <button className="search-panel-close" onClick={onClose} title="Закрыть (Esc)">
          <X size={16} />
        </button>
      </div>
      
      {results.length > 0 && (
        <div className="search-panel-results">
          {results.map((result, index) => (
            <button
              key={`${result.nodeId}-${result.field}-${result.matchStart}`}
              className={`search-panel-result ${index === currentIndex ? 'search-panel-result--active' : ''}`}
              onClick={() => {
                setCurrentIndex(index);
                onNavigateToNode(result.nodeId);
                onSelectNode(result.nodeId);
              }}
            >
              <span className="search-panel-result-field">{getFieldLabel(result.field)}</span>
              <span className="search-panel-result-preview">{result.preview}</span>
            </button>
          ))}
        </div>
      )}
      
      {query && results.length === 0 && (
        <div className="search-panel-empty">
          Ничего не найдено
        </div>
      )}
    </div>
  );
};
