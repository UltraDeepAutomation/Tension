/**
 * Council Engine
 * Implements the 3-stage consensus protocol
 * Based on Karpathy's LLM Council architecture
 */

import { getLLMGateway, LLMGateway } from '../llm/gateway';
import type { Message } from '../llm/types';
import type {
  Council,
  CouncilResult,
  Stage1Result,
  Stage2Result,
  Stage3Result,
  CouncilProgressCallback,
  EvaluatorResult,
  ResponseEvaluation,
} from '@/entities/council/model/types';

export class CouncilEngine {
  private gateway: LLMGateway;
  
  constructor(gateway?: LLMGateway) {
    this.gateway = gateway ?? getLLMGateway();
  }
  
  /**
   * Execute full council deliberation
   */
  async execute(
    council: Council,
    prompt: string,
    onProgress?: CouncilProgressCallback
  ): Promise<CouncilResult> {
    const startedAt = Date.now();
    const resultId = crypto.randomUUID();
    
    // Stage 1: Divergence
    onProgress?.({ stage: 1, stageName: 'divergence', progress: 0, message: 'Запрашиваем мнения экспертов...' });
    const stage1 = await this.executeDivergence(council, prompt, onProgress);
    onProgress?.({ stage: 1, stageName: 'divergence', progress: 100, message: 'Получены все ответы' });
    
    // Stage 2: Convergence
    onProgress?.({ stage: 2, stageName: 'convergence', progress: 0, message: 'Эксперты оценивают ответы...' });
    const stage2 = await this.executeConvergence(council, stage1, prompt, onProgress);
    onProgress?.({ stage: 2, stageName: 'convergence', progress: 100, message: 'Оценка завершена' });
    
    // Stage 3: Synthesis
    onProgress?.({ stage: 3, stageName: 'synthesis', progress: 0, message: 'Chairman синтезирует финальный ответ...' });
    const stage3 = await this.executeSynthesis(council, stage1, stage2, prompt, onProgress);
    onProgress?.({ stage: 3, stageName: 'synthesis', progress: 100, message: 'Готово!' });
    
    const completedAt = Date.now();
    
    return {
      id: resultId,
      councilId: council.id,
      originalPrompt: prompt,
      stage1,
      stage2,
      stage3,
      totalLatencyMs: completedAt - startedAt,
      totalCost: stage1.totalCost + stage2.totalCost + stage3.cost,
      startedAt,
      completedAt,
    };
  }
  
  /**
   * Stage 1: Divergence
   * Query all council members in parallel
   */
  private async executeDivergence(
    council: Council,
    prompt: string,
    onProgress?: CouncilProgressCallback
  ): Promise<Stage1Result> {
    const startTime = performance.now();
    
    const promises = council.members.map(async (member, index) => {
      const messages: Message[] = [{ role: 'user', content: prompt }];
      
      const response = await this.gateway.query({
        model: member.modelId,
        messages,
        temperature: council.temperature ?? 0.7,
        maxTokens: council.maxTokens,
      });
      
      // Update progress
      const progress = Math.round(((index + 1) / council.members.length) * 100);
      onProgress?.({ 
        stage: 1, 
        stageName: 'divergence', 
        progress, 
        message: `Получен ответ от ${member.modelId}` 
      });
      
      return {
        modelId: member.modelId,
        provider: member.provider,
        content: response.content,
        latencyMs: response.latencyMs,
        cost: response.usage.cost,
        error: response.error,
      };
    });
    
    const responses = await Promise.all(promises);
    const totalLatencyMs = performance.now() - startTime;
    const totalCost = responses.reduce((sum, r) => sum + r.cost, 0);
    
    return { responses, totalLatencyMs, totalCost };
  }
  
  /**
   * Stage 2: Convergence
   * Each evaluator ranks all responses anonymously
   */
  private async executeConvergence(
    council: Council,
    stage1: Stage1Result,
    originalPrompt: string,
    onProgress?: CouncilProgressCallback
  ): Promise<Stage2Result> {
    const startTime = performance.now();
    
    // Determine evaluators
    const evaluators = council.evaluators === 'same-as-members' 
      ? council.members 
      : council.evaluators;
    
    // Anonymize responses
    const anonymizedResponses = stage1.responses.map((r, i) => ({
      label: `Response ${String.fromCharCode(65 + i)}`, // A, B, C...
      content: r.content,
    }));
    
    // Build evaluation prompt
    const evalPrompt = this.buildEvaluationPrompt(originalPrompt, anonymizedResponses);
    
    // Query all evaluators in parallel
    const promises = evaluators.map(async (evaluator, index) => {
      const messages: Message[] = [{ role: 'user', content: evalPrompt }];
      
      const response = await this.gateway.query({
        model: evaluator.modelId,
        messages,
        temperature: 0.3, // Lower temperature for evaluation
      });
      
      // Parse rankings from response
      const rankings = this.parseRankings(response.content, stage1.responses.length);
      
      // Update progress
      const progress = Math.round(((index + 1) / evaluators.length) * 100);
      onProgress?.({ 
        stage: 2, 
        stageName: 'convergence', 
        progress, 
        message: `Оценка от ${evaluator.modelId}` 
      });
      
      return {
        evaluatorModelId: evaluator.modelId,
        rankings,
        latencyMs: response.latencyMs,
        cost: response.usage.cost,
      };
    });
    
    const evaluations = await Promise.all(promises);
    
    // Aggregate rankings
    const { aggregatedRanking, scores, agreementScore } = this.aggregateRankings(evaluations, stage1.responses.length);
    
    const totalLatencyMs = performance.now() - startTime;
    const totalCost = evaluations.reduce((sum, e) => sum + e.cost, 0);
    
    return {
      evaluations,
      aggregatedRanking,
      scores,
      agreementScore,
      totalLatencyMs,
      totalCost,
    };
  }
  
  /**
   * Stage 3: Synthesis
   * Chairman synthesizes final response
   */
  private async executeSynthesis(
    council: Council,
    stage1: Stage1Result,
    stage2: Stage2Result,
    originalPrompt: string,
    onProgress?: CouncilProgressCallback
  ): Promise<Stage3Result> {
    const synthesisPrompt = this.buildSynthesisPrompt(
      originalPrompt,
      stage1,
      stage2,
      council.synthesisStrategy
    );
    
    const messages: Message[] = [{ role: 'user', content: synthesisPrompt }];
    
    const response = await this.gateway.query({
      model: council.chairman.modelId,
      messages,
      temperature: 0.5,
      maxTokens: council.maxTokens,
    });
    
    onProgress?.({ 
      stage: 3, 
      stageName: 'synthesis', 
      progress: 100, 
      message: 'Синтез завершён' 
    });
    
    // Extract confidence from response if mentioned
    const confidence = this.extractConfidence(response.content, stage2.agreementScore);
    
    return {
      finalResponse: response.content,
      confidence,
      reasoning: `Based on ${stage1.responses.length} expert opinions with ${stage2.agreementScore}% agreement`,
      latencyMs: response.latencyMs,
      cost: response.usage.cost,
    };
  }
  
  /**
   * Build evaluation prompt for Stage 2
   */
  private buildEvaluationPrompt(
    originalPrompt: string,
    responses: Array<{ label: string; content: string }>
  ): string {
    const responsesText = responses
      .map(r => `### ${r.label}\n${r.content}`)
      .join('\n\n---\n\n');
    
    return `You are an expert evaluator. Multiple AI models have provided responses to a user's question. Your task is to rank these responses from best to worst.

## Original Question
${originalPrompt}

## Responses to Evaluate
${responsesText}

## Your Task
1. Carefully analyze each response for:
   - Accuracy and correctness
   - Completeness and depth
   - Clarity and structure
   - Practical usefulness

2. Provide your ranking in this EXACT format:
RANKING:
1. [Response Letter] - [Brief reason]
2. [Response Letter] - [Brief reason]
...

3. For each response, provide a score from 0-100.

SCORES:
[Response Letter]: [Score]
[Response Letter]: [Score]
...

Be objective and fair. Do not favor any particular response style.`;
  }
  
  /**
   * Build synthesis prompt for Stage 3
   */
  private buildSynthesisPrompt(
    originalPrompt: string,
    stage1: Stage1Result,
    stage2: Stage2Result,
    strategy: string
  ): string {
    // Format responses with their rankings
    const rankedResponses = stage2.aggregatedRanking.map((respIndex, rank) => {
      const response = stage1.responses[respIndex];
      const score = stage2.scores[respIndex];
      return `### Rank ${rank + 1} (Score: ${score}/100) - ${response.modelId}
${response.content}`;
    }).join('\n\n---\n\n');
    
    let strategyInstructions = '';
    switch (strategy) {
      case 'merge-best':
        strategyInstructions = 'Merge the best insights from all responses into a comprehensive answer.';
        break;
      case 'debate-resolve':
        strategyInstructions = 'Analyze the different perspectives and provide a balanced resolution.';
        break;
      case 'weighted-average':
        strategyInstructions = 'Weight the responses by their scores and synthesize accordingly.';
        break;
    }
    
    return `You are the Chairman of an AI Council. Multiple AI models have provided responses to a user's question, and they have been ranked by peer review.

## Original Question
${originalPrompt}

## Ranked Responses (Best to Worst)
${rankedResponses}

## Agreement Score
The evaluators agreed ${stage2.agreementScore}% on the rankings.

## Your Task
${strategyInstructions}

Provide a final, synthesized answer that represents the collective wisdom of the council. Your answer should:
1. Incorporate the best insights from top-ranked responses
2. Correct any errors identified in lower-ranked responses
3. Be comprehensive yet concise
4. Be directly useful to the user

Provide your final answer now:`;
  }
  
  /**
   * Parse rankings from evaluator response
   */
  private parseRankings(response: string, numResponses: number): ResponseEvaluation[] {
    const rankings: ResponseEvaluation[] = [];
    
    // Try to parse RANKING section
    const rankingMatch = response.match(/RANKING:?\s*([\s\S]*?)(?=SCORES:|$)/i);
    const scoresMatch = response.match(/SCORES:?\s*([\s\S]*?)$/i);
    
    // Parse rankings
    if (rankingMatch) {
      const lines = rankingMatch[1].split('\n').filter(l => l.trim());
      lines.forEach((line, index) => {
        const letterMatch = line.match(/Response\s*([A-Z])/i) || line.match(/^[0-9]+\.\s*([A-Z])/i);
        if (letterMatch) {
          const letter = letterMatch[1].toUpperCase();
          const responseIndex = letter.charCodeAt(0) - 65; // A=0, B=1, etc.
          if (responseIndex >= 0 && responseIndex < numResponses) {
            rankings.push({
              responseIndex,
              rank: index + 1,
              score: 100 - (index * (100 / numResponses)), // Default score based on rank
              critique: line,
            });
          }
        }
      });
    }
    
    // Parse scores if available
    if (scoresMatch) {
      const scoreLines = scoresMatch[1].split('\n').filter(l => l.trim());
      scoreLines.forEach(line => {
        const match = line.match(/([A-Z]):\s*(\d+)/i);
        if (match) {
          const responseIndex = match[1].toUpperCase().charCodeAt(0) - 65;
          const score = parseInt(match[2], 10);
          const existing = rankings.find(r => r.responseIndex === responseIndex);
          if (existing) {
            existing.score = score;
          }
        }
      });
    }
    
    // Fill in missing rankings with defaults
    for (let i = 0; i < numResponses; i++) {
      if (!rankings.find(r => r.responseIndex === i)) {
        rankings.push({
          responseIndex: i,
          rank: rankings.length + 1,
          score: 50,
          critique: 'No explicit ranking provided',
        });
      }
    }
    
    return rankings.sort((a, b) => a.rank - b.rank);
  }
  
  /**
   * Aggregate rankings from all evaluators
   */
  private aggregateRankings(
    evaluations: EvaluatorResult[],
    numResponses: number
  ): { aggregatedRanking: number[]; scores: number[]; agreementScore: number } {
    // Calculate average score for each response
    const scoreAccumulators = new Array(numResponses).fill(0);
    const scoreCounts = new Array(numResponses).fill(0);
    
    evaluations.forEach(evaluation => {
      evaluation.rankings.forEach(ranking => {
        if (ranking.responseIndex < numResponses) {
          scoreAccumulators[ranking.responseIndex] += ranking.score;
          scoreCounts[ranking.responseIndex]++;
        }
      });
    });
    
    const scores = scoreAccumulators.map((sum, i) => 
      scoreCounts[i] > 0 ? Math.round(sum / scoreCounts[i]) : 50
    );
    
    // Sort by score to get ranking
    const indexedScores = scores.map((score, index) => ({ score, index }));
    indexedScores.sort((a, b) => b.score - a.score);
    const aggregatedRanking = indexedScores.map(item => item.index);
    
    // Calculate agreement score (how similar are the rankings)
    let agreementSum = 0;
    let comparisons = 0;
    
    for (let i = 0; i < evaluations.length; i++) {
      for (let j = i + 1; j < evaluations.length; j++) {
        const ranking1 = evaluations[i].rankings.map(r => r.responseIndex);
        const ranking2 = evaluations[j].rankings.map(r => r.responseIndex);
        
        // Kendall tau-like similarity
        let agreements = 0;
        for (let k = 0; k < ranking1.length; k++) {
          if (ranking1[k] === ranking2[k]) agreements++;
        }
        agreementSum += (agreements / ranking1.length) * 100;
        comparisons++;
      }
    }
    
    const agreementScore = comparisons > 0 ? Math.round(agreementSum / comparisons) : 100;
    
    return { aggregatedRanking, scores, agreementScore };
  }
  
  /**
   * Extract confidence from synthesis response
   */
  private extractConfidence(response: string, agreementScore: number): number {
    // Look for explicit confidence mention
    const match = response.match(/confidence[:\s]+(\d+)/i);
    if (match) {
      return Math.min(100, Math.max(0, parseInt(match[1], 10)));
    }
    
    // Default: base on agreement score
    return Math.round(agreementScore * 0.9 + 10); // 10-100 range
  }
}

// Singleton instance
let engineInstance: CouncilEngine | null = null;

export function getCouncilEngine(): CouncilEngine {
  if (!engineInstance) {
    engineInstance = new CouncilEngine();
  }
  return engineInstance;
}
