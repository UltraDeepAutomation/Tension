import React from 'react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  React.useEffect(() => {
    const handleClick = () => onClose();
    const handleScroll = () => onClose();
    
    window.addEventListener('click', handleClick);
    window.addEventListener('contextmenu', handleClick); // Right click elsewhere closes this one
    window.addEventListener('wheel', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('contextmenu', handleClick);
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [onClose]);

  // Adjust position if it goes off screen (Basic implementation)
  const style: React.CSSProperties = {
    top: y,
    left: x,
  };

  return (
    <div
      className="context-menu"
      style={style}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, index) => (
        <button
          key={index}
          className={`context-menu-item ${item.danger ? 'context-menu-item--danger' : ''}`}
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.icon && <span className="context-menu-icon">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
};
