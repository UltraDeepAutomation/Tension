import type { ProviderId } from '@/entities/node/model/types';

/** Доступные модели для выбора */
export const AVAILABLE_MODELS: { id: string; name: string; providerId: ProviderId }[] = [
  { id: 'gpt-4.1', name: 'GPT-4.1', providerId: 'openai' },
  { id: 'gpt-4o', name: 'GPT-4o', providerId: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', providerId: 'openai' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', providerId: 'anthropic' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', providerId: 'anthropic' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', providerId: 'google' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', providerId: 'google' },
  { id: 'grok-2', name: 'Grok 2', providerId: 'xai' },
  { id: 'llama3.2', name: 'Llama 3.2', providerId: 'ollama' },
  { id: 'mistral', name: 'Mistral', providerId: 'ollama' },
];
