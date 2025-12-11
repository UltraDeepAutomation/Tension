/**
 * Google AI Adapter
 * Implements LLMAdapter for Google Gemini API
 */

import type { 
  LLMAdapter, 
  LLMRequest, 
  LLMResponse, 
  LLMMultiResponse,
  ProviderConfig, 
  ModelInfo 
} from '../types';
import { GOOGLE_MODELS } from '../models';

export class GoogleAdapter implements LLMAdapter {
  readonly providerId = 'google' as const;
  readonly providerName = 'Google AI';
  
  private apiKey: string = '';
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';
  
  configure(config: ProviderConfig): void {
    this.apiKey = config.apiKey;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }
  
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }
  
  getAvailableModels(): ModelInfo[] {
    return GOOGLE_MODELS;
  }
  
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    
    try {
      const response = await fetch(
        `${this.baseUrl}/models?key=${this.apiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async query(request: LLMRequest): Promise<LLMResponse> {
    const startTime = performance.now();
    
    // Convert messages to Gemini format
    const contents = request.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
    
    const systemInstruction = request.messages.find(m => m.role === 'system');
    
    try {
      const response = await fetch(
        `${this.baseUrl}/models/${request.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : undefined,
            generationConfig: {
              temperature: request.temperature ?? 0.7,
              maxOutputTokens: request.maxTokens ?? 4096,
              candidateCount: 1,
            },
          }),
        }
      );
      
      const latencyMs = performance.now() - startTime;
      
      if (!response.ok) {
        const error = await response.text();
        return {
          id: crypto.randomUUID(),
          model: request.model,
          provider: 'google',
          content: '',
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
          latencyMs,
          finishReason: 'error',
          error: `Google AI API error: ${response.status} - ${error}`,
        };
      }
      
      const data = await response.json();
      const candidate = data.candidates?.[0];
      const content = candidate?.content?.parts?.[0]?.text ?? '';
      
      const inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;
      const model = this.findModel(request.model);
      const cost = model 
        ? (inputTokens / 1000) * model.costPer1kInput + (outputTokens / 1000) * model.costPer1kOutput
        : 0;
      
      return {
        id: crypto.randomUUID(),
        model: request.model,
        provider: 'google',
        content,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost,
        },
        latencyMs,
        finishReason: candidate?.finishReason === 'STOP' ? 'stop' : 'length',
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        model: request.model,
        provider: 'google',
        content: '',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
        latencyMs: performance.now() - startTime,
        finishReason: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async queryMultiple(request: LLMRequest): Promise<LLMMultiResponse> {
    // Gemini supports candidateCount, but let's use parallel for consistency
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
      provider: 'google',
      choices,
      usage: totalUsage,
      latencyMs,
    };
  }
  
  private findModel(modelId: string): ModelInfo | undefined {
    return GOOGLE_MODELS.find(m => m.id === modelId);
  }
}
