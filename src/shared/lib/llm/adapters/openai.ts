/**
 * OpenAI Adapter
 * Implements LLMAdapter for OpenAI API
 */

import type { 
  LLMAdapter, 
  LLMRequest, 
  LLMResponse, 
  LLMMultiResponse,
  ProviderConfig, 
  ModelInfo 
} from '../types';
import { OPENAI_MODELS } from '../models';

export class OpenAIAdapter implements LLMAdapter {
  readonly providerId = 'openai' as const;
  readonly providerName = 'OpenAI';
  
  private apiKey: string = '';
  private baseUrl: string = 'https://api.openai.com/v1';
  
  configure(config: ProviderConfig): void {
    this.apiKey = config.apiKey;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }
  
  isConfigured(): boolean {
    return this.apiKey.length > 0 && this.apiKey.startsWith('sk-');
  }
  
  getAvailableModels(): ModelInfo[] {
    return OPENAI_MODELS;
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
          provider: 'openai',
          content: '',
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
          latencyMs,
          finishReason: 'error',
          error: `OpenAI API error: ${response.status} - ${error}`,
        };
      }
      
      const data = await response.json();
      const choice = data.choices?.[0];
      const content = choice?.message?.content ?? '';
      
      const inputTokens = data.usage?.prompt_tokens ?? 0;
      const outputTokens = data.usage?.completion_tokens ?? 0;
      const model = this.findModel(request.model);
      const cost = model 
        ? (inputTokens / 1000) * model.costPer1kInput + (outputTokens / 1000) * model.costPer1kOutput
        : 0;
      
      return {
        id: data.id ?? crypto.randomUUID(),
        model: request.model,
        provider: 'openai',
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
        provider: 'openai',
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
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }
      
      const data = await response.json();
      
      const choices = (data.choices ?? []).map((choice: { index: number; message?: { content?: string }; finish_reason?: string }) => ({
        index: choice.index,
        content: choice.message?.content ?? '',
        finishReason: choice.finish_reason === 'stop' ? 'stop' as const : 'length' as const,
      }));
      
      const inputTokens = data.usage?.prompt_tokens ?? 0;
      const outputTokens = data.usage?.completion_tokens ?? 0;
      const model = this.findModel(request.model);
      const cost = model 
        ? (inputTokens / 1000) * model.costPer1kInput + (outputTokens / 1000) * model.costPer1kOutput
        : 0;
      
      return {
        id: data.id ?? crypto.randomUUID(),
        model: request.model,
        provider: 'openai',
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
  
  private findModel(modelId: string): ModelInfo | undefined {
    return OPENAI_MODELS.find(m => m.id === modelId);
  }
}
