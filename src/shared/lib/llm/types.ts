/**
 * LLM Gateway Types
 * Unified interface for multiple LLM providers
 */

// Provider identifiers
export type ProviderId = 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'xai' 
  | 'openrouter' 
  | 'ollama';

// Provider configuration stored in IndexedDB
export interface ProviderConfig {
  id: ProviderId;
  name: string;
  apiKey: string;
  baseUrl?: string;
  isEnabled: boolean;
  lastVerified?: number;
}

// Model capabilities
export type ModelCapability = 'text' | 'code' | 'vision' | 'reasoning' | 'long-context';

// Model information
export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderId;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInput: number;  // USD
  costPer1kOutput: number; // USD
  capabilities: ModelCapability[];
  isDefault?: boolean;
}

// Chat message format (OpenAI-compatible)
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// LLM request
export interface LLMRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  n?: number; // Number of completions (for branching)
  stream?: boolean;
}

// LLM response
export interface LLMResponse {
  id: string;
  model: string;
  provider: ProviderId;
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number; // USD
  };
  latencyMs: number;
  finishReason: 'stop' | 'length' | 'error';
  error?: string;
}

// Multiple completions response
export interface LLMMultiResponse {
  id: string;
  model: string;
  provider: ProviderId;
  choices: Array<{
    index: number;
    content: string;
    finishReason: 'stop' | 'length' | 'error';
  }>;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
  latencyMs: number;
}

// Provider status
export interface ProviderStatus {
  id: ProviderId;
  isConfigured: boolean;
  isConnected: boolean;
  lastError?: string;
  availableModels: ModelInfo[];
}

// Adapter interface that each provider must implement
export interface LLMAdapter {
  readonly providerId: ProviderId;
  readonly providerName: string;
  
  // Configuration
  configure(config: ProviderConfig): void;
  isConfigured(): boolean;
  
  // Queries
  query(request: LLMRequest): Promise<LLMResponse>;
  queryMultiple(request: LLMRequest): Promise<LLMMultiResponse>;
  
  // Model info
  getAvailableModels(): ModelInfo[];
  
  // Health check
  testConnection(): Promise<boolean>;
}

// Gateway configuration
export interface GatewayConfig {
  providers: ProviderConfig[];
  defaultProvider?: ProviderId;
  defaultModel?: string;
  timeout?: number; // ms
  retryCount?: number;
}

// Parallel query result
export interface ParallelQueryResult {
  responses: LLMResponse[];
  totalLatencyMs: number; // Max of all latencies (parallel)
  totalCost: number;
  errors: Array<{ model: string; error: string }>;
}
