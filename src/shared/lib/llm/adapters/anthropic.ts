/**
 * Anthropic Adapter
 * Implements LLMAdapter for Anthropic Claude API
 */

import type { 
  LLMAdapter, 
  LLMRequest, 
  LLMResponse, 
  LLMMultiResponse,
  ProviderConfig, 
  ModelInfo 
} from '../types';
import { ANTHROPIC_MODELS } from '../models';

export class AnthropicAdapter implements LLMAdapter {
  readonly providerId = 'anthropic' as const;
  readonly providerName = 'Anthropic';
  
  private apiKey: string = '';
  private baseUrl: string = 'https://api.anthropic.com/v1';
  
  configure(config: ProviderConfig): void {
    this.apiKey = config.apiKey;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }
  
  isConfigured(): boolean {
    return this.apiKey.length > 0 && this.apiKey.startsWith('sk-ant-');
  }
  
  getAvailableModels(): ModelInfo[] {
    return ANTHROPIC_MODELS;
  }
  
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    
    try {
      // Anthropic doesn't have a simple health endpoint, so we do a minimal request
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async query(request: LLMRequest): Promise<LLMResponse> {
    const startTime = performance.now();
    
    // Convert messages to Anthropic format
    const systemMessage = request.messages.find(m => m.role === 'system');
    const otherMessages = request.messages.filter(m => m.role !== 'system');
    
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxTokens ?? 4096,
          system: systemMessage?.content,
          messages: otherMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      
      const latencyMs = performance.now() - startTime;
      
      if (!response.ok) {
        const error = await response.text();
        return {
          id: crypto.randomUUID(),
          model: request.model,
          provider: 'anthropic',
          content: '',
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
          latencyMs,
          finishReason: 'error',
          error: `Anthropic API error: ${response.status} - ${error}`,
        };
      }
      
      const data = await response.json();
      const content = data.content?.[0]?.text ?? '';
      
      const inputTokens = data.usage?.input_tokens ?? 0;
      const outputTokens = data.usage?.output_tokens ?? 0;
      const model = this.findModel(request.model);
      const cost = model 
        ? (inputTokens / 1000) * model.costPer1kInput + (outputTokens / 1000) * model.costPer1kOutput
        : 0;
      
      return {
        id: data.id ?? crypto.randomUUID(),
        model: request.model,
        provider: 'anthropic',
        content,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost,
        },
        latencyMs,
        finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'length',
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        model: request.model,
        provider: 'anthropic',
        content: '',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
        latencyMs: performance.now() - startTime,
        finishReason: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async queryMultiple(request: LLMRequest): Promise<LLMMultiResponse> {
    // Anthropic doesn't support n parameter, so we make parallel requests
    const n = request.n ?? 1;
    const startTime = performance.now();
    
    const promises = Array.from({ length: n }, () => this.query(request));
    const responses = await Promise.all(promises);
    
    const latencyMs = performance.now() - startTime;
    
    const choices = responses.map((r, index) => ({
      index,
      content: r.content,
      finishReason: r.finishReason,
    }));
    
    const totalUsage = responses.reduce(
      (acc, r) => ({
        inputTokens: acc.inputTokens + r.usage.inputTokens,
        outputTokens: acc.outputTokens + r.usage.outputTokens,
        totalTokens: acc.totalTokens + r.usage.totalTokens,
        cost: acc.cost + r.usage.cost,
      }),
      { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 }
    );
    
    return {
      id: crypto.randomUUID(),
      model: request.model,
      provider: 'anthropic',
      choices,
      usage: totalUsage,
      latencyMs,
    };
  }
  
  private findModel(modelId: string): ModelInfo | undefined {
    return ANTHROPIC_MODELS.find(m => m.id === modelId);
  }
}
