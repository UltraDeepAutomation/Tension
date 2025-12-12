import React from 'react';
import type { Node, Connection } from '@/entities/node/model/types';
import type { LLMGateway, LLMRequest, LLMResponse, ProviderConfig, ProviderId } from '@/shared/lib/llm';
import type { ToastType } from '@/shared/lib/contexts/ToastContext';
import type { CouncilPlan, CouncilBranch, CouncilMerge, BranchStatus } from './councilPlanTypes';
import { NODE_GAP_X, NODE_GAP_Y, NODE_HEIGHT, NODE_WIDTH, PROVIDER_COLORS } from '@/shared/config/constants';
import type { CouncilThinkingStep } from './useWorkspaceModel';

interface UseAutonomousCouncilParams {
  chatId: string | null;
  graph: { nodes: Node[]; connections: Connection[] };
  providers: ProviderConfig[];
  gateway: Pick<LLMGateway, 'getAvailableModels' | 'query'>;
  setGraph: React.Dispatch<React.SetStateAction<{ nodes: Node[]; connections: Connection[] }>>;
  showToast: (message: string, type?: ToastType) => void;
  mode?: 'autonomous' | 'chatgpt_only';
  allowedProviders?: ProviderId[];
}

export type AutonomousCouncilAbortReason = 'chat_switch' | 'user_stop' | 'reset' | 'restart' | 'unknown';

export interface AutonomousCouncilLogEvent {
  chatId: string | null;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  summary: string;
  details?: string;
  data?: unknown;
}

interface StartAutonomousCouncilParams {
  rootNodeId: string;
  question?: string;
  maxDepth: number;
  onThinkingStep?: (step: CouncilThinkingStep) => void;
  onLog?: (event: AutonomousCouncilLogEvent) => void;
}

interface UseAutonomousCouncilResult {
  councilPlan: CouncilPlan | null;
  startAutonomousCouncil: (params: StartAutonomousCouncilParams) => Promise<void>;
  abortAutonomousCouncil: (reason?: AutonomousCouncilAbortReason) => void;
  resetAutonomousCouncil: () => void;
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

function safePrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isProviderAllowed(allowedProviders: ProviderId[] | undefined, providerId: ProviderId): boolean {
  if (!allowedProviders || allowedProviders.length === 0) return true;
  return allowedProviders.includes(providerId);
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
  const stepX = NODE_WIDTH + NODE_GAP_X;
  const stepY = NODE_GAP_Y * 4;

  const childNodes: Node[] = branches.map((branch, index) => {
    const mid = (branches.length - 1) / 2;
    const x = parent.x + stepX;
    const y = parent.y + (index - mid) * stepY;

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

  const stepX = NODE_WIDTH + NODE_GAP_X;
  const x = parent.x + stepX * 2;
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
  mode = 'autonomous',
  allowedProviders = [],
}: UseAutonomousCouncilParams): UseAutonomousCouncilResult {
  const [councilPlan, setCouncilPlan] = React.useState<CouncilPlan | null>(null);
  const planByChatRef = React.useRef<Map<string, CouncilPlan | null>>(new Map());
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const abortReasonRef = React.useRef<AutonomousCouncilAbortReason>('unknown');

  const graphRef = React.useRef(graph);
  React.useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  const setGraphSafe = React.useCallback(
    (updater: (prev: { nodes: Node[]; connections: Connection[] }) => { nodes: Node[]; connections: Connection[] }) => {
      setGraph((prev) => {
        const next = updater(prev);
        graphRef.current = next;
        return next;
      });
    },
    [setGraph]
  );

  React.useEffect(() => {
    if (!chatId) {
      setCouncilPlan(null);
      return;
    }
    const stored = planByChatRef.current.get(chatId) ?? null;
    setCouncilPlan(stored);
    abortReasonRef.current = 'chat_switch';
    abortControllerRef.current?.abort();
  }, [chatId]);

  const persistPlan = React.useCallback(
    (next: CouncilPlan | null | ((prev: CouncilPlan | null) => CouncilPlan | null)) => {
      setCouncilPlan((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: CouncilPlan | null) => CouncilPlan | null)(prev) : next;
        if (chatId) {
          planByChatRef.current.set(chatId, resolved);
        }
        return resolved;
      });
    },
    [chatId]
  );

  const abortAutonomousCouncil = React.useCallback((reason: AutonomousCouncilAbortReason = 'unknown') => {
    abortReasonRef.current = reason;
    abortControllerRef.current?.abort();
  }, []);

  const resetAutonomousCouncil = React.useCallback(() => {
    abortReasonRef.current = 'reset';
    abortControllerRef.current?.abort();
    persistPlan(null);
  }, [persistPlan]);

  const emitLog = React.useCallback(
    (params: {
      onLog?: (event: AutonomousCouncilLogEvent) => void;
      level: AutonomousCouncilLogEvent['level'];
      summary: string;
      details?: string;
      data?: unknown;
    }) => {
      const event: AutonomousCouncilLogEvent = {
        chatId,
        timestamp: Date.now(),
        level: params.level,
        summary: params.summary,
        details: params.details,
        data: params.data,
      };

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[autonomous-council]', event);
      }

      params.onLog?.(event);
    },
    [chatId]
  );

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
    async (params: { question: string; depth: number; onLog?: (event: AutonomousCouncilLogEvent) => void }): Promise<PlannerResult> => {
      const availableModels = gateway.getAvailableModels();

      const plannerModels = mode === 'chatgpt_only'
        ? availableModels.filter((m) => m.provider === 'openai')
        : availableModels.filter((m) => isProviderAllowed(allowedProviders, m.provider));

      const configuredModels = plannerModels.filter(
        (m) => isProviderAllowed(allowedProviders, m.provider) && hasProviderApiKey(providers, m.provider)
      );
      const plannerModelId =
        configuredModels.find((m) => m.provider === 'openai' && m.id === 'gpt-4o')?.id ??
        configuredModels.find((m) => m.provider === 'openai')?.id ??
        configuredModels[0]?.id ??
        plannerModels[0]?.id ??
        'gpt-4o';
      const sampleModels = availableModels.slice(0, 24).map((m) => `${m.provider}:${m.id}`).join(', ');

      const providerRule = mode === 'chatgpt_only'
        ? 'You MUST only use providerId="openai" for ALL branches and mergeModel.'
        : `You MUST ONLY use providerId from this set: ${allowedProviders.join(', ') || '(empty)'}.`;

      const system = `You are an autonomous LLM Council planner.

IMPORTANT: The user is asking about AI models / LLMs. Do NOT interpret the question as "computers", "laptops" or hardware unless explicitly asked.

Return STRICT JSON ONLY with shape:
{"branches":[{"providerId":"openai|anthropic|google|openrouter|xai|ollama","modelId":"...","prompt":"..."}],"mergeModel":{"providerId":"...","modelId":"..."},"continue":true|false}

Rules:
- branches: 3..5 items (in chatgpt_only you may output 1..3 items if only one provider is available)
- prompts must be short and targeted; each branch explores a different angle
- Use REAL model IDs that exist in the available models list (do not invent model IDs like "claude" if it's not available)
- ${providerRule}

Available models sample: ${sampleModels}`;

      const user = `Question: ${params.question}
Depth: ${params.depth}`;

      emitLog({
        onLog: params.onLog,
        level: 'debug',
        summary: `Planner request (depth=${params.depth})`,
        data: {
          model: plannerModelId,
          system,
          user,
          mode,
          allowedProviders,
          configuredProviders: providers.filter((p) => p.isEnabled && p.apiKey).map((p) => p.id),
        },
      });

      const response = await gateway.query({
        model: plannerModelId,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });

      emitLog({
        onLog: params.onLog,
        level: response.error ? 'warn' : 'debug',
        summary: `Planner response (depth=${params.depth})`,
        data: {
          provider: response.provider,
          model: response.model,
          latencyMs: response.latencyMs,
          usage: response.usage,
          error: response.error,
          raw: response.content,
        },
      });

      const raw = response.error ? '' : response.content;
      const json = extractJsonObject(raw);
      const parsed = json ? safeJsonParse<PlannerResult>(json) : null;

      emitLog({
        onLog: params.onLog,
        level: parsed ? 'debug' : 'warn',
        summary: `Planner parse (depth=${params.depth})`,
        data: {
          extractedJson: json,
          parsed,
        },
      });

      if (parsed?.branches?.length) {
        return parsed;
      }

      // Fallback: simple heuristic
      const fallbackModels = availableModels
        .filter((m) => isProviderAllowed(allowedProviders, m.provider) && hasProviderApiKey(providers, m.provider))
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
    [allowedProviders, gateway, mode, providers]
  );

  const startAutonomousCouncil = React.useCallback(
    async ({ rootNodeId, question, maxDepth, onThinkingStep, onLog }: StartAutonomousCouncilParams) => {
      const rootNode = graphRef.current.nodes.find((n) => n.id === rootNodeId);
      if (!rootNode) {
        showToast('Корневая нода не найдена', 'error');
        return;
      }

      const resolvedQuestion = (question ?? rootNode.prompt ?? rootNode.context).trim();
      if (!resolvedQuestion) {
        showToast('Введите вопрос', 'error');
        return;
      }

      if (abortControllerRef.current) {
        abortReasonRef.current = 'restart';
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      emitLog({
        onLog,
        level: 'info',
        summary: 'Council run started',
        details: `mode=${mode}\nmaxDepth=${maxDepth}\nquestion=${resolvedQuestion}`,
      });

      // Ensure at least one provider is configured
      const anyConfigured = providers.some((p) => p.isEnabled && p.apiKey);
      if (!anyConfigured) {
        showToast('Настройте хотя бы одного провайдера в Settings', 'error');
        return;
      }

      if (mode === 'chatgpt_only' && !isProviderAllowed(allowedProviders, 'openai')) {
        showToast('Для режима ChatGPT Only включите OpenAI в Allowed providers', 'error');
        return;
      }

      // Update root node prompt with question
      setGraphSafe((prev) => ({
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
          throw new DOMException(`Autonomous council aborted (${abortReasonRef.current})`, 'AbortError');
        }

        const entry = graphRef.current.nodes.find((n) => n.id === entryNodeId) ?? rootNode;

        emitLog({
          onLog,
          level: 'info',
          summary: `Wave ${depth + 1}/${normalizedDepth}: planning`,
          details: `entryNodeId=${entry.id}`,
        });

        const planned = await planWave({ question: resolvedQuestion, depth, onLog });

        emitLog({
          onLog,
          level: 'debug',
          summary: `Wave ${depth + 1}: planner output`,
          details: safePrettyJson(planned),
        });

        const filteredOut = planned.branches
          .map((b) => {
            const reasons: string[] = [];
            if (!isProviderAllowed(allowedProviders, b.providerId)) reasons.push('provider_not_allowed');
            if (!hasProviderApiKey(providers, b.providerId)) reasons.push('missing_api_key_or_disabled');
            return { branch: b, reasons };
          })
          .filter((x) => x.reasons.length > 0);

        if (filteredOut.length > 0) {
          emitLog({
            onLog,
            level: 'info',
            summary: `Wave ${depth + 1}: branches filtered out (${filteredOut.length})`,
            data: filteredOut,
          });
        }

        const branches = planned.branches
          .filter((b) => isProviderAllowed(allowedProviders, b.providerId))
          .filter((b) => hasProviderApiKey(providers, b.providerId))
          .slice(0, 5);

        emitLog({
          onLog,
          level: 'info',
          summary: `Wave ${depth + 1}: branches selected (${branches.length})`,
          details: branches.map((b, i) => `${i + 1}. ${b.providerId}/${b.modelId} — ${b.prompt.slice(0, 120)}`).join('\n'),
          data: branches,
        });

        if (branches.length === 0) {
          showToast('Нет доступных моделей (проверьте API keys)', 'error');
          break;
        }

        const { childNodes, connections } = createBranchNodes({ parent: entry, branches });

        emitLog({
          onLog,
          level: 'info',
          summary: `Wave ${depth + 1}: nodes created (${childNodes.length} branches)`,
          details: childNodes.map((n) => `${n.id} @ (${Math.round(n.x)}, ${Math.round(n.y)}) ${n.providerId}/${n.modelId}`).join('\n'),
        });

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

        setGraphSafe((prev) => ({
          ...prev,
          nodes: [...prev.nodes, ...childNodes],
          connections: [...prev.connections, ...connections],
        }));

        updateBranchStatuses(branchPlanItems.map((b) => b.id), 'running');

        const branchResults = await Promise.all(
          childNodes.map(async (node, idx) => {
            try {
              if (controller.signal.aborted) {
                throw new DOMException(`Autonomous council aborted (${abortReasonRef.current})`, 'AbortError');
              }

              emitLog({
                onLog,
                level: 'info',
                summary: `Wave ${depth + 1}: branch ${idx + 1}/${childNodes.length} query`,
                details: `${node.providerId}/${node.modelId}\nnodeId=${node.id}`,
              });

              const request: LLMRequest = {
                model: node.modelId ?? 'gpt-4o',
                messages: [{ role: 'user', content: node.prompt || resolvedQuestion }],
              };

              emitLog({
                onLog,
                level: 'debug',
                summary: `Wave ${depth + 1}: branch ${idx + 1} request`,
                data: {
                  nodeId: node.id,
                  providerId: node.providerId,
                  modelId: node.modelId,
                  request,
                },
              });

              const result: LLMResponse = await gateway.query(request);

              const output = result.error ? `⚠️ ${result.error}` : result.content;

              setGraphSafe((prev) => ({
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

              emitLog({
                onLog,
                level: result.error ? 'warn' : 'info',
                summary: `Wave ${depth + 1}: branch ${idx + 1} done`,
                details: `${node.providerId}/${node.modelId}\nlatencyMs=${result.latencyMs}\n${result.error ? `error=${result.error}` : 'ok'}`,
                data: {
                  nodeId: node.id,
                  providerId: node.providerId,
                  modelId: node.modelId,
                  latencyMs: result.latencyMs,
                  usage: result.usage,
                  error: result.error,
                  output,
                },
              });

              return { providerId: (node.providerId ?? 'openai') as ProviderId, modelId: node.modelId ?? 'unknown', content: output };
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Branch error';

              emitLog({
                onLog,
                level: error instanceof DOMException && error.name === 'AbortError' ? 'warn' : 'error',
                summary: `Wave ${depth + 1}: branch ${idx + 1} failed`,
                details: errorMessage,
              });

              setGraphSafe((prev) => ({
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

        const resolvedMergeModel = mode === 'chatgpt_only'
          ? { providerId: 'openai' as const, modelId: mergeModel.modelId }
          : mergeModel;

        if (!isProviderAllowed(allowedProviders, resolvedMergeModel.providerId)) {
          showToast('Merge-провайдер не разрешён (Allowed providers)', 'error');
          break;
        }

        const mergePrompt = buildMergePrompt(resolvedQuestion, branchResults);

        emitLog({
          onLog,
          level: 'info',
          summary: `Wave ${depth + 1}: merge selected ${resolvedMergeModel.providerId}/${resolvedMergeModel.modelId}`,
          details: `sources=${branchResults.length}`,
        });

        const { mergeNode, connections: mergeConnections } = createMergeNode({
          wave: depth,
          parent: entry,
          branchNodes: childNodes,
          mergeModel: resolvedMergeModel,
          question: resolvedQuestion,
          mergePrompt,
        });

        const mergePlanItem: CouncilMerge = {
          id: crypto.randomUUID(),
          wave: depth,
          inputNodeIds: childNodes.map((n) => n.id),
          outputNodeId: mergeNode.id,
          providerId: resolvedMergeModel.providerId,
          status: 'queued',
        };

        persistPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            merges: [...prev.merges, mergePlanItem],
          };
        });

        setGraphSafe((prev) => ({
          ...prev,
          nodes: [...prev.nodes, mergeNode],
          connections: [...prev.connections, ...mergeConnections],
        }));

        updateMergeStatus(mergePlanItem.id, 'running');

        emitLog({
          onLog,
          level: 'info',
          summary: `Wave ${depth + 1}: merge query`,
          details: `nodeId=${mergeNode.id}\n${mergeNode.providerId}/${mergeNode.modelId}`,
          data: {
            nodeId: mergeNode.id,
            providerId: mergeNode.providerId,
            modelId: mergeNode.modelId,
            prompt: mergePrompt,
          },
        });

        const mergeRequest: LLMRequest = {
          model: mergeNode.modelId ?? 'gpt-4o',
          messages: [{ role: 'user', content: mergePrompt }],
        };
        const mergeResult: LLMResponse = await gateway.query(mergeRequest);

        const mergeOutput = mergeResult.error ? `⚠️ ${mergeResult.error}` : mergeResult.content;

        emitLog({
          onLog,
          level: mergeResult.error ? 'warn' : 'info',
          summary: `Wave ${depth + 1}: merge done`,
          details: `latencyMs=${mergeResult.latencyMs}\n${mergeResult.error ? `error=${mergeResult.error}` : 'ok'}`,
          data: {
            nodeId: mergeNode.id,
            providerId: mergeNode.providerId,
            modelId: mergeNode.modelId,
            latencyMs: mergeResult.latencyMs,
            usage: mergeResult.usage,
            error: mergeResult.error,
            output: mergeOutput,
          },
        });

        setGraphSafe((prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) => (n.id === mergeNode.id ? { ...n, isPlaying: false, modelResponse: mergeOutput, error: mergeResult.error } : n)),
        }));

        updateMergeStatus(mergePlanItem.id, mergeResult.error ? 'error' : 'done', mergeResult.error);

        onThinkingStep?.({
          id: crypto.randomUUID(),
          stage: 'synthesis',
          agentId: 'chairman',
          agentName: 'Chairman',
          providerId: (mergeNode.providerId ?? 'openai') as ProviderId,
          modelId: mergeNode.modelId ?? 'gpt-4o',
          input: mergePrompt,
          output: mergeOutput,
          timestamp: Date.now(),
          duration: mergeResult.latencyMs,
          nodeId: mergeNode.id,
        });

        emitLog({
          onLog,
          level: 'debug',
          summary: `Thinking step: synthesis`,
          data: {
            stage: 'synthesis',
            agentName: 'Chairman',
            providerId: mergeNode.providerId,
            modelId: mergeNode.modelId,
            nodeId: mergeNode.id,
            timestamp: Date.now(),
            duration: mergeResult.latencyMs,
            input: mergePrompt,
            output: mergeOutput,
          },
        });

        entryNodeId = mergeNode.id;
      }

      showToast('Autonomous Council: готово', 'success');
    },
    [allowedProviders, gateway, mode, persistPlan, planWave, providers, setGraphSafe, showToast, updateBranchStatuses, updateMergeStatus]
  );

  return {
    councilPlan,
    startAutonomousCouncil,
    abortAutonomousCouncil,
    resetAutonomousCouncil,
  };
}
