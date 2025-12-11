/**
 * OpenRouter Adapter
 * Unified gateway to all LLM providers through OpenRouter
 * This is the recommended adapter for multi-model access
 */

import type { 
  LLMAdapter, 
  LLMRequest, 
  LLMResponse, 
  LLMMultiResponse,
  ProviderConfig, 
  ModelInfo 
} from '../types';
import { getAllModels } from '../models';

export class OpenRouterAdapter implements LLMAdapter {
  readonly providerId = 'openrouter' as const;
  readonly providerName = 'OpenRouter';
  
  private apiKey: string = '';
  private baseUrl: string = 'https://openrouter.ai/api/v1';
  
  configure(config: ProviderConfig): void {
    this.apiKey = config.apiKey;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }
  
  isConfigured(): boolean {
    return this.apiKey.length > 0 && this.apiKey.startsWith('sk-or-');
  }
  
  getAvailableModels(): ModelInfo[] {
    // OpenRouter provides access to all models
    // Map our model IDs to OpenRouter format
    return getAllModels().map(m => ({
      ...m,
      id: this.toOpenRouterModelId(m.id, m.provider),
    }));
  }
  
  private toOpenRouterModelId(modelId: string, provider: string): string {
    // OpenRouter uses format: provider/model
    const providerMap: Record<string, string> = {
      openai: 'openai',
      anthropic: 'anthropic',
      google: 'google',
      xai: 'x-ai',
    };
    return `${providerMap[provider] ?? provider}/${modelId}`;
  }
  
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async query(request: LLMRequest): Promise<LLMResponse> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://tension.app',
          'X-Title': 'Tension',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens,
          n: 1,
        }),
      });
      
      const latencyMs = performance.now() - startTime;
      
      if (!response.ok) {
        const error = await response.text();
        return {
          id: crypto.randomUUID(),
          model: request.model,
          provider: 'openrouter',
          content: '',
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
          latencyMs,
          finishReason: 'error',
          error: `OpenRouter API error: ${response.status} - ${error}`,
        };
      }
      
      const data = await response.json();
      const choice = data.choices?.[0];
      const content = choice?.message?.content ?? '';
      
      const inputTokens = data.usage?.prompt_tokens ?? 0;
      const outputTokens = data.usage?.completion_tokens ?? 0;
      // OpenRouter provides cost in the response
      const cost = data.usage?.total_cost ?? 0;
      
      return {
        id: data.id ?? crypto.randomUUID(),
        model: request.model,
        provider: 'openrouter',
        content,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost,
        },
        latencyMs,
        finishReason: choice?.finish_reason === 'stop' ? 'stop' : 'length',
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        model: request.model,
        provider: 'openrouter',
        content: '',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
        latencyMs: performance.now() - startTime,
        finishReason: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async queryMultiple(request: LLMRequest): Promise<LLMMultiResponse> {
    const startTime = performance.now();
    const n = request.n ?? 1;
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://tension.app',
          'X-Title': 'Tension',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens,
          n,
        }),
      });
      
      const latencyMs = performance.now() - startTime;
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }
      
      const data = await response.json();
      
      const choices = (data.choices ?? []).map((choice: { index: number; message?: { content?: string }; finish_reason?: string }) => ({
        index: choice.index,
        content: choice.message?.content ?? '',
        finishReason: choice.finish_reason === 'stop' ? 'stop' as const : 'length' as const,
      }));
      
      const inputTokens = data.usage?.prompt_tokens ?? 0;
      const outputTokens = data.usage?.completion_tokens ?? 0;
      const cost = data.usage?.total_cost ?? 0;
      
      return {
        id: data.id ?? crypto.randomUUID(),
        model: request.model,
        provider: 'openrouter',
        choices,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost,
        },
        latencyMs,
      };
    } catch (error) {
      throw error;
    }
  }
}
