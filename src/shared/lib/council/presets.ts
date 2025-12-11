/**
 * Preset Councils
 * Pre-configured councils for common use cases
 */

import type { Council } from '@/entities/council/model/types';

export const PRESET_COUNCILS: Council[] = [
  {
    id: 'research',
    name: 'Research Council',
    description: 'Глубокий анализ и исследование темы с разных точек зрения',
    icon: '📚',
    members: [
      { modelId: 'gpt-4o', provider: 'openai' },
      { modelId: 'claude-sonnet-4-20250514', provider: 'anthropic' },
      { modelId: 'gemini-2.0-pro', provider: 'google' },
    ],
    evaluators: 'same-as-members',
    evaluationStrategy: 'peer-review',
    chairman: { modelId: 'gpt-4o', provider: 'openai' },
    synthesisStrategy: 'merge-best',
    temperature: 0.7,
    anonymizeResponses: true,
  },
  {
    id: 'code-review',
    name: 'Code Review Council',
    description: 'Ревью кода с разных точек зрения: архитектура, безопасность, производительность',
    icon: '🔧',
    members: [
      { modelId: 'gpt-4o', provider: 'openai' },
      { modelId: 'claude-sonnet-4-20250514', provider: 'anthropic' },
      { modelId: 'gpt-4o-mini', provider: 'openai' },
    ],
    evaluators: 'same-as-members',
    evaluationStrategy: 'peer-review',
    chairman: { modelId: 'claude-sonnet-4-20250514', provider: 'anthropic' },
    synthesisStrategy: 'merge-best',
    temperature: 0.3,
    anonymizeResponses: true,
  },
  {
    id: 'creative',
    name: 'Creative Council',
    description: 'Креативные идеи и brainstorming с максимальным разнообразием',
    icon: '🎨',
    members: [
      { modelId: 'gpt-4o', provider: 'openai' },
      { modelId: 'claude-sonnet-4-20250514', provider: 'anthropic' },
      { modelId: 'gemini-2.0-flash', provider: 'google' },
    ],
    evaluators: 'same-as-members',
    evaluationStrategy: 'voting',
    chairman: { modelId: 'gpt-4o', provider: 'openai' },
    synthesisStrategy: 'merge-best',
    temperature: 0.9,
    anonymizeResponses: true,
  },
  {
    id: 'debate',
    name: 'Debate Council',
    description: 'Структурированные дебаты Pro vs Contra с независимым судьёй',
    icon: '⚖️',
    members: [
      { modelId: 'gpt-4o', provider: 'openai', role: 'pro' },
      { modelId: 'claude-sonnet-4-20250514', provider: 'anthropic', role: 'contra' },
    ],
    evaluators: [
      { modelId: 'gemini-2.0-pro', provider: 'google' },
    ],
    evaluationStrategy: 'judge',
    chairman: { modelId: 'gemini-2.0-pro', provider: 'google' },
    synthesisStrategy: 'debate-resolve',
    temperature: 0.7,
    anonymizeResponses: false, // Show who argued what
  },
  {
    id: 'quick',
    name: 'Quick Council',
    description: 'Быстрый и дешёвый консенсус для простых вопросов',
    icon: '⚡',
    members: [
      { modelId: 'gpt-4o-mini', provider: 'openai' },
      { modelId: 'gemini-2.0-flash', provider: 'google' },
      { modelId: 'claude-3-5-haiku-20241022', provider: 'anthropic' },
    ],
    evaluators: 'same-as-members',
    evaluationStrategy: 'voting',
    chairman: { modelId: 'gpt-4o-mini', provider: 'openai' },
    synthesisStrategy: 'weighted-average',
    temperature: 0.5,
    anonymizeResponses: true,
  },
  {
    id: 'accuracy',
    name: 'Accuracy Council',
    description: 'Максимальная точность для фактических вопросов',
    icon: '🎯',
    members: [
      { modelId: 'o1', provider: 'openai' },
      { modelId: 'claude-sonnet-4-20250514', provider: 'anthropic' },
      { modelId: 'gpt-4o', provider: 'openai' },
    ],
    evaluators: 'same-as-members',
    evaluationStrategy: 'peer-review',
    chairman: { modelId: 'o1', provider: 'openai' },
    synthesisStrategy: 'merge-best',
    temperature: 0.2,
    anonymizeResponses: true,
  },
];

/**
 * Get council by ID
 */
export function getCouncilById(id: string): Council | undefined {
  return PRESET_COUNCILS.find(c => c.id === id);
}

/**
 * Get all preset councils
 */
export function getAllPresetCouncils(): Council[] {
  return PRESET_COUNCILS;
}

/**
 * Create custom council
 */
export function createCustomCouncil(partial: Partial<Council>): Council {
  return {
    id: partial.id ?? crypto.randomUUID(),
    name: partial.name ?? 'Custom Council',
    description: partial.description ?? '',
    icon: partial.icon ?? '🏛️',
    members: partial.members ?? [{ modelId: 'gpt-4o', provider: 'openai' }],
    evaluators: partial.evaluators ?? 'same-as-members',
    evaluationStrategy: partial.evaluationStrategy ?? 'peer-review',
    chairman: partial.chairman ?? { modelId: 'gpt-4o', provider: 'openai' },
    synthesisStrategy: partial.synthesisStrategy ?? 'merge-best',
    temperature: partial.temperature ?? 0.7,
    anonymizeResponses: partial.anonymizeResponses ?? true,
  };
}
