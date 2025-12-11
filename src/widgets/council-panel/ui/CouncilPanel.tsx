import React from 'react';
import { Users, Zap, Check } from 'lucide-react';
import type { Council } from '@/entities/council/model/types';
import { PRESET_COUNCILS } from '@/shared/lib/council/presets';

interface CouncilPanelProps {
  isOpen: boolean;
  selectedCouncilId: string | null;
  onSelectCouncil: (council: Council) => void;
  onClose: () => void;
}

export const CouncilPanel: React.FC<CouncilPanelProps> = ({
  isOpen,
  selectedCouncilId,
  onSelectCouncil,
  onClose,
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="council-panel-overlay" onClick={onClose}>
      <div className="council-panel" onClick={(e) => e.stopPropagation()}>
        <div className="council-panel-header">
          <div className="council-panel-title">
            <Users size={20} />
            <span>Выберите Council</span>
          </div>
          <button className="council-panel-close" onClick={onClose}>×</button>
        </div>
        
        <div className="council-panel-body">
          <p className="council-panel-description">
            Council — это группа AI-моделей, которые работают вместе для получения лучшего ответа.
            Каждая модель даёт свой ответ, затем они оценивают друг друга, и Chairman синтезирует финальный результат.
          </p>
          
          <div className="council-grid">
            {PRESET_COUNCILS.map(council => (
              <div
                key={council.id}
                className={`council-card ${selectedCouncilId === council.id ? 'council-card--selected' : ''}`}
                onClick={() => onSelectCouncil(council)}
              >
                <div className="council-card-header">
                  <span className="council-card-icon">{council.icon}</span>
                  <span className="council-card-name">{council.name}</span>
                  {selectedCouncilId === council.id && (
                    <Check size={16} className="council-card-check" />
                  )}
                </div>
                
                <p className="council-card-description">{council.description}</p>
                
                <div className="council-card-members">
                  <span className="council-card-members-label">Участники:</span>
                  <div className="council-card-members-list">
                    {council.members.map((m, i) => (
                      <span key={i} className="council-member-tag">
                        {m.modelId.split('-')[0]}
                        {m.role && <span className="council-member-role">({m.role})</span>}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="council-card-footer">
                  <span className="council-card-strategy">
                    <Zap size={12} />
                    {council.evaluationStrategy}
                  </span>
                  <span className="council-card-chairman">
                    Chairman: {council.chairman.modelId.split('-')[0]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="council-panel-footer">
          <button className="council-panel-button" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
