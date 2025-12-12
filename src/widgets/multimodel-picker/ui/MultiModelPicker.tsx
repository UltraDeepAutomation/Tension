import React from 'react';
import { AVAILABLE_MODELS } from '@/shared/config/models';
import type { ProviderId } from '@/entities/node/model/types';

interface MultiModelPickerProps {
  isOpen: boolean;
  selected: Set<string>;
  onClose: () => void;
  onApply: (models: { modelId: string; providerId: ProviderId }[]) => void;
}

export const MultiModelPicker: React.FC<MultiModelPickerProps> = ({
  isOpen,
  selected,
  onClose,
  onApply,
}) => {
  const [localSelection, setLocalSelection] = React.useState<Set<string>>(selected);

  React.useEffect(() => {
    setLocalSelection(selected);
  }, [selected, isOpen]);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setLocalSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = () => {
    const models = AVAILABLE_MODELS.filter((m) => localSelection.has(m.id)).map((m) => ({
      modelId: m.id,
      providerId: m.providerId,
    }));
    onApply(models);
    onClose();
  };

  return (
    <div className="multimodel-backdrop" onClick={onClose}>
      <div className="multimodel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="multimodel-header">
          <div>Выберите модели (multi-model branching)</div>
          <button className="multimodel-close" onClick={onClose}>×</button>
        </div>
        <div className="multimodel-list">
          {AVAILABLE_MODELS.map((model) => (
            <label key={model.id} className="multimodel-item">
              <input
                type="checkbox"
                checked={localSelection.has(model.id)}
                onChange={() => toggle(model.id)}
              />
              <span className="multimodel-name">{model.name}</span>
              <span className={`multimodel-provider multimodel-provider--${model.providerId}`}>
                {model.providerId}
              </span>
            </label>
          ))}
        </div>
        <div className="multimodel-actions">
          <button className="multimodel-secondary" onClick={onClose}>Отмена</button>
          <button
            className="multimodel-primary"
            onClick={handleApply}
            disabled={localSelection.size === 0}
          >
            Запустить
          </button>
        </div>
      </div>
    </div>
  );
};
