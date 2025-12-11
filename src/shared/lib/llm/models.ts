/**
 * Available models configuration
 * Centralized registry of all supported models
 */

import type { ModelInfo, ProviderId } from './types';

// OpenAI models
export const OPENAI_MODELS: ModelInfo[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
    capabilities: ['text', 'code', 'vision', 'reasoning'],
    isDefault: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    capabilities: ['text', 'code', 'vision'],
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
    capabilities: ['text', 'code', 'vision', 'reasoning'],
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1 (Preview)',
    provider: 'openai',
    contextWindow: 1000000,
    maxOutputTokens: 32768,
    costPer1kInput: 0.002,
    costPer1kOutput: 0.008,
    capabilities: ['text', 'code', 'reasoning', 'long-context'],
  },
  {
    id: 'o1',
    name: 'o1 (Reasoning)',
    provider: 'openai',
    contextWindow: 200000,
    maxOutputTokens: 100000,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.06,
    capabilities: ['text', 'code', 'reasoning'],
  },
  {
    id: 'o1-mini',
    name: 'o1 Mini',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 65536,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.012,
    capabilities: ['text', 'code', 'reasoning'],
  },
];

// Anthropic models
export const ANTHROPIC_MODELS: ModelInfo[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 64000,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    capabilities: ['text', 'code', 'vision', 'reasoning', 'long-context'],
    isDefault: true,
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    capabilities: ['text', 'code', 'vision', 'reasoning', 'long-context'],
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.0008,
    costPer1kOutput: 0.004,
    capabilities: ['text', 'code', 'vision'],
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    capabilities: ['text', 'code', 'vision', 'reasoning', 'long-context'],
  },
];

// Google models
export const GOOGLE_MODELS: ModelInfo[] = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.0,
    costPer1kOutput: 0.0,
    capabilities: ['text', 'code', 'vision', 'long-context'],
    isDefault: true,
  },
  {
    id: 'gemini-2.0-pro',
    name: 'Gemini 2.0 Pro',
    provider: 'google',
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005,
    capabilities: ['text', 'code', 'vision', 'reasoning', 'long-context'],
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005,
    capabilities: ['text', 'code', 'vision', 'reasoning', 'long-context'],
  },
];

// xAI models
export const XAI_MODELS: ModelInfo[] = [
  {
    id: 'grok-3',
    name: 'Grok 3',
    provider: 'xai',
    contextWindow: 131072,
    maxOutputTokens: 131072,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    capabilities: ['text', 'code', 'reasoning'],
    isDefault: true,
  },
  {
    id: 'grok-3-fast',
    name: 'Grok 3 Fast',
    provider: 'xai',
    contextWindow: 131072,
    maxOutputTokens: 131072,
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0025,
    capabilities: ['text', 'code'],
  },
];

// Ollama (local) models - detected dynamically
export const OLLAMA_MODELS: ModelInfo[] = [
  {
    id: 'llama3.3:70b',
    name: 'Llama 3.3 70B',
    provider: 'ollama',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    capabilities: ['text', 'code', 'reasoning'],
  },
  {
    id: 'llama3.2:latest',
    name: 'Llama 3.2',
    provider: 'ollama',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    capabilities: ['text', 'code'],
  },
  {
    id: 'mistral:latest',
    name: 'Mistral',
    provider: 'ollama',
    contextWindow: 32000,
    maxOutputTokens: 4096,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    capabilities: ['text', 'code'],
  },
  {
    id: 'codellama:latest',
    name: 'CodeLlama',
    provider: 'ollama',
    contextWindow: 16000,
    maxOutputTokens: 4096,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    capabilities: ['code'],
  },
];

// All models by provider
export const MODELS_BY_PROVIDER: Record<ProviderId, ModelInfo[]> = {
  openai: OPENAI_MODELS,
  anthropic: ANTHROPIC_MODELS,
  google: GOOGLE_MODELS,
  xai: XAI_MODELS,
  openrouter: [], // Dynamic - aggregates all
  ollama: OLLAMA_MODELS,
};

// Get all available models
export function getAllModels(): ModelInfo[] {
  return [
    ...OPENAI_MODELS,
    ...ANTHROPIC_MODELS,
    ...GOOGLE_MODELS,
    ...XAI_MODELS,
    ...OLLAMA_MODELS,
  ];
}

// Get models for a specific provider
export function getModelsByProvider(providerId: ProviderId): ModelInfo[] {
  return MODELS_BY_PROVIDER[providerId] ?? [];
}

// Find model by ID
export function findModel(modelId: string): ModelInfo | undefined {
  return getAllModels().find(m => m.id === modelId);
}

// Get default model for provider
export function getDefaultModel(providerId: ProviderId): ModelInfo | undefined {
  const models = getModelsByProvider(providerId);
  return models.find(m => m.isDefault) ?? models[0];
}

// Provider display info
export const PROVIDER_INFO: Record<ProviderId, { name: string; icon: string; baseUrl: string }> = {
  openai: {
    name: 'OpenAI',
    icon: '🤖',
    baseUrl: 'https://api.openai.com/v1',
  },
  anthropic: {
    name: 'Anthropic',
    icon: '🧠',
    baseUrl: 'https://api.anthropic.com/v1',
  },
  google: {
    name: 'Google AI',
    icon: '🔮',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  },
  xai: {
    name: 'xAI',
    icon: '⚡',
    baseUrl: 'https://api.x.ai/v1',
  },
  openrouter: {
    name: 'OpenRouter',
    icon: '🌐',
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  ollama: {
    name: 'Ollama (Local)',
    icon: '🦙',
    baseUrl: 'http://localhost:11434/api',
  },
};
