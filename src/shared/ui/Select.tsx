import React, { useState, useRef, useEffect } from 'react';
import { IconChevronDown } from '@/shared/ui/Icons';

interface Option {
  value: number | string;
  label: string;
}

interface SelectProps {
  value: number | string;
  options: Option[];
  onChange: (value: any) => void;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({ value, options, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div
      className={`custom-select ${className || ''} ${isOpen ? 'custom-select--open' : ''}`}
      ref={rootRef}
      onClick={(e) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
      }}
    >
      <div className="custom-select-trigger">
        <span>{selectedOption.label}</span>
        <IconChevronDown width={12} height={12} className="custom-select-arrow" />
      </div>
      {isOpen && (
        <div className="custom-select-options">
          {options.map((option) => (
            <div
              key={option.value}
              className={`custom-select-option ${option.value === value ? 'custom-select-option--selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
