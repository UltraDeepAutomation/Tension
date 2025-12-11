/**
 * Council Types
 * Types for multi-model consensus system
 */

import type { ModelInfo, ProviderId } from '@/shared/lib/llm/types';

// Council member with optional role
export interface CouncilMember {
  modelId: string;
  provider: ProviderId;
  role?: 'pro' | 'contra' | 'neutral'; // For debate mode
}

// Evaluation strategy
export type EvaluationStrategy = 
  | 'peer-review'     // Each model evaluates others
  | 'self-consistency' // Same model multiple times
  | 'voting'          // Simple majority vote
  | 'judge';          // Single judge model

// Synthesis strategy
export type SynthesisStrategy = 
  | 'merge-best'      // Merge best parts from all
  | 'debate-resolve'  // Resolve debate with verdict
  | 'weighted-average'; // Weight by rankings

// Council configuration
export interface Council {
  id: string;
  name: string;
  description: string;
  icon: string;
  
  // Stage 1: Divergence - who generates responses
  members: CouncilMember[];
  
  // Stage 2: Convergence - who evaluates
  evaluators: CouncilMember[] | 'same-as-members';
  evaluationStrategy: EvaluationStrategy;
  
  // Stage 3: Synthesis - who makes final decision
  chairman: CouncilMember;
  synthesisStrategy: SynthesisStrategy;
  
  // Optional settings
  temperature?: number;
  maxTokens?: number;
  anonymizeResponses?: boolean; // Default true
}

// Stage 1: Individual response from a model
export interface Stage1Response {
  modelId: string;
  provider: ProviderId;
  content: string;
  latencyMs: number;
  cost: number;
  error?: string;
}

// Stage 1 result
export interface Stage1Result {
  responses: Stage1Response[];
  totalLatencyMs: number; // Max of all (parallel)
  totalCost: number;
}

// Single evaluation (one model evaluating one response)
export interface ResponseEvaluation {
  responseIndex: number;
  rank: number;        // 1 = best
  score: number;       // 0-100
  critique: string;    // Why this ranking
}

// Evaluator's full evaluation
export interface EvaluatorResult {
  evaluatorModelId: string;
  rankings: ResponseEvaluation[];
  latencyMs: number;
  cost: number;
}

// Stage 2 result
export interface Stage2Result {
  evaluations: EvaluatorResult[];
  aggregatedRanking: number[];  // Response indices sorted by score
  scores: number[];             // Score for each response
  agreementScore: number;       // 0-100, how much evaluators agree
  totalLatencyMs: number;
  totalCost: number;
}

// Stage 3 result
export interface Stage3Result {
  finalResponse: string;
  confidence: number;   // 0-100
  reasoning: string;    // Why this synthesis
  latencyMs: number;
  cost: number;
}

// Complete council result
export interface CouncilResult {
  id: string;
  councilId: string;
  originalPrompt: string;
  
  stage1: Stage1Result;
  stage2: Stage2Result;
  stage3: Stage3Result;
  
  // Totals
  totalLatencyMs: number;
  totalCost: number;
  
  // Metadata
  startedAt: number;
  completedAt: number;
}

// Progress callback for UI updates
export interface CouncilProgress {
  stage: 1 | 2 | 3;
  stageName: 'divergence' | 'convergence' | 'synthesis';
  progress: number; // 0-100
  message: string;
}

export type CouncilProgressCallback = (progress: CouncilProgress) => void;
