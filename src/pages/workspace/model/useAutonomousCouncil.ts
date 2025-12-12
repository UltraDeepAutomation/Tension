import React from 'react';
import type { Node, Connection } from '@/entities/node/model/types';
import type { ProviderConfig, ProviderId } from '@/shared/lib/llm';
import type { ToastType } from '@/shared/lib/contexts/ToastContext';
import type { CouncilPlan, CouncilBranch, CouncilMerge, BranchStatus } from './councilPlanTypes';
import { PROVIDER_COLORS, NODE_HEIGHT } from '@/shared/config/constants';
import type { CouncilThinkingStep } from './useWorkspaceModel';

interface UseAutonomousCouncilParams {
  chatId: string | null;
  graph: { nodes: Node[]; connections: Connection[] };
  providers: ProviderConfig[];
  gateway: {
    getAvailableModels: () => Array<{ id: string; provider: ProviderId }>;
    query: (request: { model: string; messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> }) => Promise<{ content: string; error?: string; provider: ProviderId; latencyMs: number }>;
  };
  setGraph: React.Dispatch<React.SetStateAction<{ nodes: Node[]; connections: Connection[] }>>;
  showToast: (message: string, type?: ToastType) => void;
}

interface StartAutonomousCouncilParams {
  rootNodeId: string;
  question?: string;
  maxDepth: number;
  onThinkingStep?: (step: CouncilThinkingStep) => void;
}

interface UseAutonomousCouncilResult {
  councilPlan: CouncilPlan | null;
  startAutonomousCouncil: (params: StartAutonomousCouncilParams) => Promise<void>;
  abortAutonomousCouncil: () => void;
}

type PlannerBranchSpec = { providerId: ProviderId; modelId: string; prompt: string };

type PlannerResult = {
  branches: PlannerBranchSpec[];
  mergeModel?: { providerId: ProviderId; modelId: string };
  continue?: boolean;
};

function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function hasProviderApiKey(providers: ProviderConfig[], providerId: ProviderId): boolean {
  const provider = providers.find((p) => p.id === providerId);
  return Boolean(provider?.apiKey && provider.isEnabled);
}

function buildMergePrompt(question: string, branchResults: Array<{ modelId: string; providerId: ProviderId; content: string }>): string {
  const blocks = branchResults
    .map((r, i) => `### Source ${i + 1} (${r.providerId}/${r.modelId})\n${r.content}`)
    .join('\n\n---\n\n');

  return `You are the Chairman. Synthesize the best possible final answer to the user's question using the sources below.

## User question
${question}

## Sources
${blocks}

## Requirements
- Be accurate and practical
- If sources disagree, explain and resolve
- Output in Markdown
`;
}

function createBranchNodes(params: {
  parent: Node;
  branches: PlannerBranchSpec[];
}): { childNodes: Node[]; connections: Connection[] } {
  const { parent, branches } = params;
  const radius = 420;

  const childNodes: Node[] = branches.map((branch, index) => {
    const angle = (index / Math.max(1, branches.length)) * Math.PI - Math.PI / 2;
    const x = parent.x + Math.cos(angle) * radius;
    const y = parent.y + NODE_HEIGHT + 120 + Math.sin(angle) * radius * 0.5;

    const id = crypto.randomUUID();
    return {
      id,
      x,
      y,
      context: parent.prompt || parent.context,
      modelResponse: null,
      prompt: branch.prompt,
      branchCount: 1,
      deepLevel: 1,
      isRoot: false,
      isPlaying: true,
      inputs: [{ id: crypto.randomUUID(), nodeId: id, type: 'input', dataType: 'text', index: 0 }],
      outputs: [{ id: crypto.randomUUID(), nodeId: id, type: 'output', dataType: 'text', index: 0 }],
      providerId: branch.providerId,
      modelId: branch.modelId,
      type: 'standard',
    };
  });

  const connections: Connection[] = childNodes.map((child) => ({
    id: crypto.randomUUID(),
    fromNodeId: parent.id,
    fromPortIndex: 0,
    toNodeId: child.id,
    toPortIndex: 0,
    providerId: child.providerId,
    color: child.providerId ? PROVIDER_COLORS[child.providerId] : undefined,
  }));

  return { childNodes, connections };
}

function createMergeNode(params: {
  wave: number;
  parent: Node;
  branchNodes: Node[];
  mergeModel: { providerId: ProviderId; modelId: string };
  question: string;
  mergePrompt: string;
}): { mergeNode: Node; connections: Connection[] } {
  const { wave, parent, branchNodes, mergeModel, mergePrompt } = params;

  const x = parent.x + 760;
  const avgY = branchNodes.length
    ? branchNodes.reduce((sum, n) => sum + n.y, 0) / branchNodes.length
    : parent.y + NODE_HEIGHT + 200;

  const id = crypto.randomUUID();
  const mergeNode: Node = {
    id,
    x,
    y: avgY,
    context: parent.prompt || parent.context,
    modelResponse: null,
    prompt: mergePrompt,
    branchCount: 1,
    deepLevel: 1,
    isRoot: false,
    isPlaying: true,
    inputs: [{ id: crypto.randomUUID(), nodeId: id, type: 'input', dataType: 'text', index: 0 }],
    outputs: [{ id: crypto.randomUUID(), nodeId: id, type: 'output', dataType: 'text', index: 0 }],
    providerId: mergeModel.providerId,
    modelId: mergeModel.modelId,
    type: 'synthesis',
  };

  const connections: Connection[] = branchNodes.map((branchNode, index) => ({
    id: crypto.randomUUID(),
    fromNodeId: branchNode.id,
    fromPortIndex: 0,
    toNodeId: mergeNode.id,
    toPortIndex: 0,
    providerId: mergeNode.providerId,
    color: mergeNode.providerId ? PROVIDER_COLORS[mergeNode.providerId] : undefined,
  }));

  return { mergeNode, connections };
}

export function useAutonomousCouncil({
  chatId,
  graph,
  providers,
  gateway,
  setGraph,
  showToast,
}: UseAutonomousCouncilParams): UseAutonomousCouncilResult {
  const [councilPlan, setCouncilPlan] = React.useState<CouncilPlan | null>(null);
  const planByChatRef = React.useRef<Map<string, CouncilPlan | null>>(new Map());
  const abortControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    if (!chatId) {
      setCouncilPlan(null);
      return;
    }
    const stored = planByChatRef.current.get(chatId) ?? null;
    setCouncilPlan(stored);
    abortControllerRef.current?.abort();
  }, [chatId]);

  const persistPlan = React.useCallback(
    (next: CouncilPlan | null) => {
      if (chatId) {
        planByChatRef.current.set(chatId, next);
      }
      setCouncilPlan(next);
    },
    [chatId]
  );

  const abortAutonomousCouncil = React.useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const updateBranchStatuses = React.useCallback(
    (branchIds: string[], status: BranchStatus, error?: string) => {
      if (branchIds.length === 0) return;
      const setIds = new Set(branchIds);
      persistPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          branches: prev.branches.map((b) => {
            if (!setIds.has(b.id)) return b;
            return {
              ...b,
              status,
              error: status === 'error' ? error : undefined,
              startedAt: status === 'running' ? Date.now() : b.startedAt,
              finishedAt: status === 'done' || status === 'error' ? Date.now() : b.finishedAt,
            };
          }),
        };
      });
    },
    [persistPlan]
  );

  const updateMergeStatus = React.useCallback(
    (mergeId: string, status: BranchStatus, error?: string) => {
      persistPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          merges: prev.merges.map((m) =>
            m.id === mergeId
              ? {
                  ...m,
                  status,
                  error: status === 'error' ? error : undefined,
                }
              : m
          ),
        };
      });
    },
    [persistPlan]
  );

  const planWave = React.useCallback(
    async (params: { question: string; depth: number }): Promise<PlannerResult> => {
      const availableModels = gateway.getAvailableModels();
      const sampleModels = availableModels.slice(0, 24).map((m) => `${m.provider}:${m.id}`).join(', ');

      const system = `You are an autonomous LLM Council planner.
Return STRICT JSON ONLY with shape:
{"branches":[{"providerId":"openai|anthropic|google|openrouter|xai|ollama","modelId":"...","prompt":"..."}],"mergeModel":{"providerId":"...","modelId":"..."},"continue":true|false}
Rules:
- branches: 3..5 items
- prefer diverse providers
- prompts must be short and targeted; each branch explores different angle
Available models sample: ${sampleModels}`;

      const user = `Question: ${params.question}
Depth: ${params.depth}`;

      const response = await gateway.query({ model: 'gpt-4o', messages: [{ role: 'system', content: system }, { role: 'user', content: user }] });
      const raw = response.error ? '' : response.content;
      const json = extractJsonObject(raw);
      const parsed = json ? safeJsonParse<PlannerResult>(json) : null;

      if (parsed?.branches?.length) {
        return parsed;
      }

      // Fallback: simple heuristic
      const fallbackModels = availableModels
        .filter((m) => hasProviderApiKey(providers, m.provider))
        .slice(0, 3);

      const branches: PlannerBranchSpec[] = fallbackModels.map((m, i) => ({
        providerId: m.provider,
        modelId: m.id,
        prompt: i === 0 ? params.question : `Answer with a different angle: ${params.question}`,
      }));

      return {
        branches,
        mergeModel: fallbackModels[0]
          ? { providerId: fallbackModels[0].provider, modelId: fallbackModels[0].id }
          : { providerId: 'openai', modelId: 'gpt-4o' },
        continue: params.depth < 1,
      };
    },
    [gateway, providers]
  );

  const startAutonomousCouncil = React.useCallback(
    async ({ rootNodeId, question, maxDepth, onThinkingStep }: StartAutonomousCouncilParams) => {
      const rootNode = graph.nodes.find((n) => n.id === rootNodeId);
      if (!rootNode) {
        showToast('Корневая нода не найдена', 'error');
        return;
      }

      const resolvedQuestion = (question ?? rootNode.prompt ?? rootNode.context).trim();
      if (!resolvedQuestion) {
        showToast('Введите вопрос', 'error');
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Ensure at least one provider is configured
      const anyConfigured = providers.some((p) => p.isEnabled && p.apiKey);
      if (!anyConfigured) {
        showToast('Настройте хотя бы одного провайдера в Settings', 'error');
        return;
      }

      // Update root node prompt with question
      setGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === rootNodeId ? { ...n, prompt: resolvedQuestion } : n)),
      }));

      const normalizedDepth = Math.max(1, Math.min(maxDepth, 6));
      const plan: CouncilPlan = {
        maxDepth: normalizedDepth,
        waves: normalizedDepth,
        branches: [],
        merges: [],
      };
      persistPlan(plan);

      let entryNodeId = rootNodeId;

      for (let depth = 0; depth < normalizedDepth; depth++) {
        if (controller.signal.aborted) {
          throw new DOMException('Autonomous council aborted', 'AbortError');
        }

        const entryNode = (depth === 0 ? graph.nodes.find((n) => n.id === entryNodeId) : undefined) ??
          ((): Node | undefined => undefined)();

        const entry = entryNode ?? graph.nodes.find((n) => n.id === entryNodeId) ?? rootNode;

        const planned = await planWave({ question: resolvedQuestion, depth });
        const branches = planned.branches
          .filter((b) => hasProviderApiKey(providers, b.providerId))
          .slice(0, 5);

        if (branches.length === 0) {
          showToast('Нет доступных моделей (проверьте API keys)', 'error');
          break;
        }

        const { childNodes, connections } = createBranchNodes({ parent: entry, branches });

        const branchPlanItems: CouncilBranch[] = childNodes.map((node) => ({
          id: crypto.randomUUID(),
          wave: depth,
          modelId: node.modelId ?? 'unknown',
          providerId: (node.providerId ?? 'openai') as ProviderId,
          sourceNodeId: entry.id,
          nodeId: node.id,
          status: 'queued',
        }));

        persistPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            branches: [...prev.branches, ...branchPlanItems],
          };
        });

        setGraph((prev) => ({
          ...prev,
          nodes: [...prev.nodes, ...childNodes],
          connections: [...prev.connections, ...connections],
        }));

        updateBranchStatuses(branchPlanItems.map((b) => b.id), 'running');

        const branchResults = await Promise.all(
          childNodes.map(async (node, idx) => {
            try {
              const result = await gateway.query({
                model: node.modelId ?? 'gpt-4o',
                messages: [{ role: 'user', content: node.prompt || resolvedQuestion }],
              });

              const output = result.error ? `⚠️ ${result.error}` : result.content;

              setGraph((prev) => ({
                ...prev,
                nodes: prev.nodes.map((n) =>
                  n.id === node.id
                    ? {
                        ...n,
                        isPlaying: false,
                        modelResponse: output,
                        error: result.error,
                      }
                    : n
                ),
              }));

              updateBranchStatuses([branchPlanItems[idx].id], result.error ? 'error' : 'done', result.error);

              onThinkingStep?.({
                id: crypto.randomUUID(),
                stage: 'divergence',
                agentId: node.modelId ?? 'unknown',
                agentName: node.modelId ?? 'Model',
                providerId: (node.providerId ?? 'openai') as ProviderId,
                modelId: node.modelId ?? 'unknown',
                input: resolvedQuestion,
                output,
                timestamp: Date.now(),
                duration: result.latencyMs,
                nodeId: node.id,
              });

              return { providerId: (node.providerId ?? 'openai') as ProviderId, modelId: node.modelId ?? 'unknown', content: output };
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Branch error';
              setGraph((prev) => ({
                ...prev,
                nodes: prev.nodes.map((n) => (n.id === node.id ? { ...n, isPlaying: false, modelResponse: `⚠️ ${errorMessage}`, error: errorMessage } : n)),
              }));
              updateBranchStatuses([branchPlanItems[idx].id], 'error', errorMessage);
              return { providerId: (node.providerId ?? 'openai') as ProviderId, modelId: node.modelId ?? 'unknown', content: `⚠️ ${errorMessage}` };
            }
          })
        );

        const mergeModel = planned.mergeModel && hasProviderApiKey(providers, planned.mergeModel.providerId)
          ? planned.mergeModel
          : { providerId: branchResults[0]?.providerId ?? 'openai', modelId: branchResults[0]?.modelId ?? 'gpt-4o' };

        const mergePrompt = buildMergePrompt(resolvedQuestion, branchResults);
        const { mergeNode, connections: mergeConnections } = createMergeNode({
          wave: depth,
          parent: entry,
          branchNodes: childNodes,
          mergeModel,
          question: resolvedQuestion,
          mergePrompt,
        });

        const mergePlanItem: CouncilMerge = {
          id: crypto.randomUUID(),
          wave: depth,
          inputNodeIds: childNodes.map((n) => n.id),
          outputNodeId: mergeNode.id,
          providerId: mergeModel.providerId,
          status: 'queued',
        };

        persistPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            merges: [...prev.merges, mergePlanItem],
          };
        });

        setGraph((prev) => ({
          ...prev,
          nodes: [...prev.nodes, mergeNode],
          connections: [...prev.connections, ...mergeConnections],
        }));

        updateMergeStatus(mergePlanItem.id, 'running');

        const mergeResult = await gateway.query({
          model: mergeNode.modelId ?? 'gpt-4o',
          messages: [{ role: 'user', content: mergePrompt }],
        });

        const mergeOutput = mergeResult.error ? `⚠️ ${mergeResult.error}` : mergeResult.content;

        setGraph((prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) => (n.id === mergeNode.id ? { ...n, isPlaying: false, modelResponse: mergeOutput, error: mergeResult.error } : n)),
        }));

        updateMergeStatus(mergePlanItem.id, mergeResult.error ? 'error' : 'done', mergeResult.error);

        onThinkingStep?.({
          id: crypto.randomUUID(),
          stage: 'synthesis',
          agentId: mergeNode.modelId ?? 'merge',
          agentName: 'Chairman',
          providerId: mergeModel.providerId,
          modelId: mergeNode.modelId ?? 'merge',
          input: 'Синтез ответов',
          output: mergeOutput,
          timestamp: Date.now(),
          duration: mergeResult.latencyMs,
          nodeId: mergeNode.id,
        });

        entryNodeId = mergeNode.id;

        if (planned.continue === false) {
          break;
        }
      }

      showToast('Autonomous Council: готово', 'success');
    },
    [gateway, graph.nodes, persistPlan, planWave, providers, setGraph, showToast, updateBranchStatuses, updateMergeStatus]
  );

  return {
    councilPlan,
    startAutonomousCouncil,
    abortAutonomousCouncil,
  };
}
