import React from 'react';
import type { Node, Connection } from '@/entities/node/model/types';
import type { ProviderId } from '@/shared/lib/llm';
import type { ToastType } from '@/shared/lib/contexts/ToastContext';
import type { CouncilPlan, BranchStatus, CouncilBranch } from './councilPlanTypes';

interface UseCouncilPlanParams {
  graph: { nodes: Node[]; connections: Connection[] };
  selectedCouncilId: string | null;
  playCouncil: (params: { nodeId: string; councilId: string; silent?: boolean }) => Promise<void>;
  showToast: (message: string, type?: ToastType) => void;
}

interface StartPlanParams {
  rootNodeId: string;
  maxDepth: number;
}

interface UseCouncilPlanResult {
  councilPlan: CouncilPlan | null;
  startCouncilPlan: (params: StartPlanParams) => Promise<void>;
  abortCouncilPlan: () => void;
}

export function useCouncilPlan({
  graph,
  selectedCouncilId,
  playCouncil,
  showToast,
}: UseCouncilPlanParams): UseCouncilPlanResult {
  const [councilPlan, setCouncilPlan] = React.useState<CouncilPlan | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const updateBranchStatuses = React.useCallback((branchIds: string[], status: BranchStatus, error?: string) => {
    if (branchIds.length === 0) return;
    const idSet = new Set(branchIds);
    setCouncilPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        branches: prev.branches.map((branch) => {
          if (!idSet.has(branch.id)) return branch;
          return {
            ...branch,
            status,
            error: status === 'error' ? error : undefined,
            startedAt: status === 'running' ? Date.now() : branch.startedAt,
            finishedAt: status === 'done' || status === 'error' ? Date.now() : branch.finishedAt,
          };
        }),
      };
    });
  }, []);

  const buildCouncilPlan = React.useCallback(
    (rootNodeId: string, maxDepth: number): CouncilPlan => {
      const normalizedDepth = Math.max(1, Math.min(maxDepth, 6));
      const adjacency = new Map<string, Set<string>>();
      graph.connections.forEach((conn) => {
        if (!adjacency.has(conn.fromNodeId)) {
          adjacency.set(conn.fromNodeId, new Set());
        }
        adjacency.get(conn.fromNodeId)!.add(conn.toNodeId);
      });

      const waves: string[][] = [];
      const visited = new Set<string>();
      let currentLevel: string[] = [];
      if (graph.nodes.find((n) => n.id === rootNodeId)) {
        currentLevel = [rootNodeId];
      }

      let depth = 0;
      while (currentLevel.length > 0 && depth < normalizedDepth) {
        waves.push(currentLevel);
        currentLevel.forEach((nodeId) => visited.add(nodeId));

        const nextLevelSet = new Set<string>();
        currentLevel.forEach((nodeId) => {
          adjacency.get(nodeId)?.forEach((childId) => {
            if (!visited.has(childId)) {
              nextLevelSet.add(childId);
            }
          });
        });

        currentLevel = Array.from(nextLevelSet);
        depth += 1;
      }

      const branches: CouncilBranch[] = [];
      waves.forEach((nodeIds, waveIndex) => {
        nodeIds.forEach((nodeId) => {
          const node = graph.nodes.find((n) => n.id === nodeId);
          const providerId = (node?.providerId ?? 'openai') as ProviderId;
          const modelId = node?.modelId ?? 'gpt-4o';
          const parentConn = graph.connections.find((conn) => conn.toNodeId === nodeId);

          branches.push({
            id: crypto.randomUUID(),
            wave: waveIndex,
            modelId,
            providerId,
            sourceNodeId: parentConn?.fromNodeId ?? nodeId,
            nodeId,
            status: 'queued',
          });
        });
      });

      return {
        maxDepth: normalizedDepth,
        waves: waves.length,
        branches,
        merges: [],
      };
    },
    [graph.connections, graph.nodes]
  );

  const runCouncilPlan = React.useCallback(
    async (plan: CouncilPlan, councilId: string, signal: AbortSignal) => {
      for (let waveIndex = 0; waveIndex < plan.waves; waveIndex++) {
        if (signal.aborted) {
          throw new DOMException('Plan aborted', 'AbortError');
        }

        const waveBranches = plan.branches.filter((branch) => branch.wave === waveIndex);
        if (waveBranches.length === 0) continue;

        updateBranchStatuses(
          waveBranches.map((branch) => branch.id),
          'running'
        );

        await Promise.all(
          waveBranches.map(async (branch) => {
            if (signal.aborted) {
              throw new DOMException('Plan aborted', 'AbortError');
            }
            try {
              await playCouncil({ nodeId: branch.nodeId, councilId, silent: true });
              updateBranchStatuses([branch.id], 'done');
            } catch (error) {
              if (error instanceof DOMException && error.name === 'AbortError') {
                throw error;
              }
              const errorMessage = error instanceof Error ? error.message : 'Ошибка ветки';
              updateBranchStatuses([branch.id], 'error', errorMessage);
            }
          })
        );
      }
    },
    [playCouncil, updateBranchStatuses]
  );

  const startCouncilPlan = React.useCallback(
    async ({ rootNodeId, maxDepth }: StartPlanParams) => {
      if (!selectedCouncilId) {
        showToast('Выберите council перед запуском плана', 'error');
        return;
      }

      const plan = buildCouncilPlan(rootNodeId, maxDepth);
      if (plan.branches.length === 0) {
        setCouncilPlan(plan);
        showToast('Не удалось построить план: нет доступных узлов', 'error');
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setCouncilPlan(plan);

      try {
        await runCouncilPlan(plan, selectedCouncilId, controller.signal);
        showToast('План Council завершён', 'success');
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          const message = error instanceof Error ? error.message : 'Ошибка выполнения плана';
          showToast(message, 'error');
        }
      }
    },
    [buildCouncilPlan, runCouncilPlan, selectedCouncilId, showToast]
  );

  const abortCouncilPlan = React.useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    councilPlan,
    startCouncilPlan,
    abortCouncilPlan,
  };
}
