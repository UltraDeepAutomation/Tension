/**
 * Ollama Adapter
 * Implements LLMAdapter for local Ollama models
 * Free, private, runs on user's machine
 */

import type { 
  LLMAdapter, 
  LLMRequest, 
  LLMResponse, 
  LLMMultiResponse,
  ProviderConfig, 
  ModelInfo 
} from '../types';
import { OLLAMA_MODELS } from '../models';

export class OllamaAdapter implements LLMAdapter {
  readonly providerId = 'ollama' as const;
  readonly providerName = 'Ollama (Local)';
  
  private baseUrl: string = 'http://localhost:11434';
  private availableModels: ModelInfo[] = [];
  
  configure(config: ProviderConfig): void {
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }
  
  isConfigured(): boolean {
    // Ollama doesn't need API key, just needs to be running
    return true;
  }
  
  getAvailableModels(): ModelInfo[] {
    return this.availableModels.length > 0 ? this.availableModels : OLLAMA_MODELS;
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        // Update available models based on what's installed
        this.availableModels = (data.models ?? []).map((m: { name: string }) => ({
          id: m.name,
          name: m.name,
          provider: 'ollama' as const,
          contextWindow: 128000,
          maxOutputTokens: 4096,
          costPer1kInput: 0,
          costPer1kOutput: 0,
          capabilities: ['text', 'code'] as const,
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
  
  async query(request: LLMRequest): Promise<LLMResponse> {
    const startTime = performance.now();
    
    // Convert to Ollama format
    const messages = request.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));
    
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          messages,
          stream: false,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxTokens ?? 4096,
          },
        }),
      });
      
      const latencyMs = performance.now() - startTime;
      
      if (!response.ok) {
        const error = await response.text();
        return {
          id: crypto.randomUUID(),
          model: request.model,
          provider: 'ollama',
          content: '',
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
          latencyMs,
          finishReason: 'error',
          error: `Ollama error: ${response.status} - ${error}`,
        };
      }
      
      const data = await response.json();
      const content = data.message?.content ?? '';
      
      // Ollama provides token counts
      const inputTokens = data.prompt_eval_count ?? 0;
      const outputTokens = data.eval_count ?? 0;
      
      return {
        id: crypto.randomUUID(),
        model: request.model,
        provider: 'ollama',
        content,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost: 0, // Free!
        },
        latencyMs,
        finishReason: data.done ? 'stop' : 'length',
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        model: request.model,
        provider: 'ollama',
        content: '',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
        latencyMs: performance.now() - startTime,
        finishReason: 'error',
        error: error instanceof Error ? error.message : 'Ollama not running',
      };
    }
  }
  
  async queryMultiple(request: LLMRequest): Promise<LLMMultiResponse> {
    // Ollama doesn't support n parameter, so we make parallel requests
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
        cost: 0,
      }),
      { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 }
    );
    
    return {
      id: crypto.randomUUID(),
      model: request.model,
      provider: 'ollama',
      choices,
      usage: totalUsage,
      latencyMs,
    };
  }
}
