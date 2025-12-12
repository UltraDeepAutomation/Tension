import type { ProviderId } from '@/shared/lib/llm';

export type BranchStatus = 'queued' | 'running' | 'done' | 'error';

export interface CouncilBranch {
  id: string;
  wave: number;
  modelId: string;
  providerId: ProviderId;
  sourceNodeId: string;
  nodeId: string;
  status: BranchStatus;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
}

export interface CouncilMerge {
  id: string;
  wave: number;
  inputNodeIds: string[];
  outputNodeId: string;
  providerId: ProviderId;
  status: BranchStatus;
  error?: string;
}

export interface CouncilPlan {
  maxDepth: number;
  waves: number;
  branches: CouncilBranch[];
  merges: CouncilMerge[];
}
