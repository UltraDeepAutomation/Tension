import React, { useEffect, useState, useMemo } from 'react';

export interface CommandAction {
  id: string;
  label: string;
  shortcut?: string[];
  perform: () => void;
  icon?: React.ReactNode;
  group?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandAction[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, actions }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredActions = useMemo(() => {
    if (!query) return actions;
    return actions.filter(action => 
      action.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, actions]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredActions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const action = filteredActions[selectedIndex];
        if (action) {
          action.perform();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette-modal" onClick={e => e.stopPropagation()}>
        <div className="command-palette-search">
          <span className="command-palette-icon">›</span>
          <input
            autoFocus
            type="text"
            placeholder="Type a command..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="command-palette-input"
          />
          <kbd className="command-palette-badge">ESC</kbd>
        </div>
        <div className="command-palette-list">
          {filteredActions.map((action, index) => (
            <div
              key={action.id}
              className={`command-palette-item ${index === selectedIndex ? 'command-palette-item--selected' : ''}`}
              onClick={() => {
                action.perform();
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="command-palette-item-label">
                {action.icon && <span className="command-palette-item-icon">{action.icon}</span>}
                {action.label}
              </div>
              {action.shortcut && (
                <div className="command-palette-shortcut">
                  {action.shortcut.map(k => <kbd key={k}>{k}</kbd>)}
                </div>
              )}
            </div>
          ))}
          {filteredActions.length === 0 && (
            <div className="command-palette-empty">No results found.</div>
          )}
        </div>
      </div>
    </div>
  );
};
