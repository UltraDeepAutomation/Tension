/**
 * LLM Gateway
 * Unified interface for querying multiple LLM providers
 */

import type { 
  LLMAdapter, 
  LLMRequest, 
  LLMResponse, 
  LLMMultiResponse,
  ProviderConfig, 
  ProviderId,
  ProviderStatus,
  ModelInfo,
  ParallelQueryResult,
  Message,
} from './types';
import { 
  OpenAIAdapter, 
  AnthropicAdapter, 
  GoogleAdapter, 
  OpenRouterAdapter, 
  OllamaAdapter 
} from './adapters';
import { findModel, PROVIDER_INFO } from './models';

export class LLMGateway {
  private adapters: Map<ProviderId, LLMAdapter> = new Map();
  private configs: Map<ProviderId, ProviderConfig> = new Map();
  
  constructor() {
    // Initialize all adapters
    this.adapters.set('openai', new OpenAIAdapter());
    this.adapters.set('anthropic', new AnthropicAdapter());
    this.adapters.set('google', new GoogleAdapter());
    this.adapters.set('openrouter', new OpenRouterAdapter());
    this.adapters.set('ollama', new OllamaAdapter());
  }
  
  /**
   * Configure a provider with API key
   */
  configureProvider(config: ProviderConfig): void {
    const adapter = this.adapters.get(config.id);
    if (adapter) {
      adapter.configure(config);
      this.configs.set(config.id, config);
    }
  }
  
  /**
   * Configure multiple providers at once
   */
  configureProviders(configs: ProviderConfig[]): void {
    configs.forEach(config => this.configureProvider(config));
  }
  
  /**
   * Get provider status
   */
  getProviderStatus(providerId: ProviderId): ProviderStatus {
    const adapter = this.adapters.get(providerId);
    const config = this.configs.get(providerId);
    
    return {
      id: providerId,
      isConfigured: adapter?.isConfigured() ?? false,
      isConnected: config?.isEnabled ?? false,
      availableModels: adapter?.getAvailableModels() ?? [],
    };
  }
  
  /**
   * Get all provider statuses
   */
  getAllProviderStatuses(): ProviderStatus[] {
    return Array.from(this.adapters.keys()).map(id => this.getProviderStatus(id));
  }
  
  /**
   * Get all available models from configured providers
   */
  getAvailableModels(): ModelInfo[] {
    const models: ModelInfo[] = [];
    
    for (const [providerId, adapter] of this.adapters) {
      if (adapter.isConfigured()) {
        models.push(...adapter.getAvailableModels());
      }
    }
    
    return models;
  }
  
  /**
   * Query a single model
   */
  async query(request: LLMRequest): Promise<LLMResponse> {
    const model = findModel(request.model);
    const providerId = model?.provider ?? this.detectProvider(request.model);
    const adapter = this.adapters.get(providerId);
    
    if (!adapter) {
      return {
        id: crypto.randomUUID(),
        model: request.model,
        provider: providerId,
        content: '',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
        latencyMs: 0,
        finishReason: 'error',
        error: `No adapter found for provider: ${providerId}`,
      };
    }
    
    if (!adapter.isConfigured()) {
      return {
        id: crypto.randomUUID(),
        model: request.model,
        provider: providerId,
        content: '',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
        latencyMs: 0,
        finishReason: 'error',
        error: `Provider ${PROVIDER_INFO[providerId].name} is not configured. Please add API key in Settings.`,
      };
    }
    
    return adapter.query(request);
  }
  
  /**
   * Query a single model with multiple completions (branching)
   */
  async queryMultiple(request: LLMRequest): Promise<LLMMultiResponse> {
    const model = findModel(request.model);
    const providerId = model?.provider ?? this.detectProvider(request.model);
    const adapter = this.adapters.get(providerId);
    
    if (!adapter || !adapter.isConfigured()) {
      throw new Error(`Provider ${providerId} is not configured`);
    }
    
    return adapter.queryMultiple(request);
  }
  
  /**
   * Query multiple models in parallel (for Council)
   */
  async queryParallel(
    models: string[], 
    prompt: string,
    systemPrompt?: string
  ): Promise<ParallelQueryResult> {
    const startTime = performance.now();
    
    const messages: Message[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
    
    const promises = models.map(model => 
      this.query({ model, messages })
    );
    
    const responses = await Promise.all(promises);
    
    const totalLatencyMs = performance.now() - startTime;
    const totalCost = responses.reduce((sum, r) => sum + r.usage.cost, 0);
    const errors = responses
      .filter(r => r.finishReason === 'error')
      .map(r => ({ model: r.model, error: r.error ?? 'Unknown error' }));
    
    return {
      responses,
      totalLatencyMs,
      totalCost,
      errors,
    };
  }
  
  /**
   * Test connection to a provider
   */
  async testProvider(providerId: ProviderId): Promise<boolean> {
    const adapter = this.adapters.get(providerId);
    if (!adapter) return false;
    return adapter.testConnection();
  }
  
  /**
   * Detect provider from model ID
   */
  private detectProvider(modelId: string): ProviderId {
    if (modelId.startsWith('gpt-') || modelId.startsWith('o1')) return 'openai';
    if (modelId.startsWith('claude-')) return 'anthropic';
    if (modelId.startsWith('gemini-')) return 'google';
    if (modelId.startsWith('grok-')) return 'xai';
    if (modelId.includes('/')) return 'openrouter';
    return 'ollama';
  }
}

// Singleton instance
let gatewayInstance: LLMGateway | null = null;

export function getLLMGateway(): LLMGateway {
  if (!gatewayInstance) {
    gatewayInstance = new LLMGateway();
  }
  return gatewayInstance;
}

export function resetLLMGateway(): void {
  gatewayInstance = null;
}
