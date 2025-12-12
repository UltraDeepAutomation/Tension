import React, { useCallback } from 'react';
import { CanvasState, defaultCanvasState } from '@/entities/canvas/model/types';
import { Settings } from '@/entities/settings/model/types';
import { Connection, Node } from '@/entities/node/model/types';
import {
  readSetting,
  saveSetting,
  readChats,
  saveChat,
  deleteChat,
  readNodesByChat,
  saveNodesByChat,
  readConnectionsByChat,
  saveConnectionsByChat,
  ChatRecord,
} from '@/shared/db/tensionDb';
import { 
  NODE_WIDTH, 
  NODE_HEIGHT, 
  NODE_GAP_X, 
  NODE_GAP_Y,
  SIDEBAR_WIDTH,
  SIDEBAR_PADDING,
  CANVAS_OFFSET_LIMIT,
  DEBOUNCE_SAVE_MS,
  PROVIDER_COLORS,
} from '@/shared/config/constants';
import { useHistory } from '@/shared/lib/hooks/useHistory';
import { useToast } from '@/shared/lib/contexts/ToastContext';
import { getLLMGateway, type ProviderConfig, type ProviderId } from '@/shared/lib/llm';
import { getCouncilEngine, getCouncilById, PRESET_COUNCILS } from '@/shared/lib/council';
import type { Council, CouncilResult } from '@/entities/council';
import { autoLayoutNodes, arrangeInGrid } from '@/shared/lib/autoLayout';
import type { CouncilPlan } from './councilPlanTypes';
import { useCouncilPlan } from './useCouncilPlan';

export interface WorkspaceState {
  canvas: CanvasState;
  settings: Settings;
  nodes: Node[];
  connections: Connection[];
  chats: ChatRecord[];
  currentChatId: string | null;
  isSaving: boolean;
  isLoading: boolean;
  canUndo: boolean;
  canRedo: boolean;
  // Multi-provider support
  providers: ProviderConfig[];
  selectedCouncilId: string | null;
  councilPlan: CouncilPlan | null;
}

export interface WorkspaceModel {
  state: WorkspaceState;
  actions: {
    setTool: (tool: CanvasState['tool']) => void;
    changeZoom: (delta: number) => void;
    zoomAtPoint: (delta: number, clientX: number, clientY: number, canvasRect: DOMRect) => void;
    resetZoom: () => void;
    centerCanvas: () => void;
    centerOnNode: (nodeId: string) => void;
    panCanvas: (dx: number, dy: number) => void;
    setSettingsModel: (model: string) => void;
    updateNodePosition: (id: string, x: number, y: number, isTransient?: boolean) => void;
    updateNodePrompt: (id: string, prompt: string) => void;
    updateNodeBranchCount: (id: string, count: 1 | 2 | 3 | 4) => void;
    updateNodeDeepLevel: (id: string, level: 1 | 2 | 3 | 4) => void;
    updateNodeModel: (id: string, modelId: string, providerId: ProviderId) => void;
    playNode: (params: { nodeId: string; apiKey: string; model: string }) => Promise<void>;
    clearData: () => void;
    createChat: () => Promise<void>;
    selectChat: (chatId: string) => Promise<void>;
    deleteChat: (chatId: string) => Promise<void>;
    deleteNode: (nodeId: string) => void;
    duplicateNode: (nodeId: string) => void;
    copyNodes: (nodeIds: string[]) => void;
    pasteNodes: () => void;
    autoLayout: () => void;
    arrangeSelectedInGrid: (nodeIds: string[]) => void;
    exportChat: () => void;
    importChat: (file: File) => Promise<void>;
    undo: () => void;
    redo: () => void;
    // Multi-provider actions
    updateProvider: (config: ProviderConfig) => void;
    testProvider: (providerId: ProviderId) => Promise<boolean>;
    selectCouncil: (councilId: string | null) => void;
    playCouncil: (params: { nodeId: string; councilId: string; onThinkingStep?: (step: CouncilThinkingStep) => void; silent?: boolean }) => Promise<void>;
    playMultiModel: (params: { nodeId: string; models: { modelId: string; providerId: ProviderId }[] }) => Promise<void>;
    startCouncilPlan: (params: { rootNodeId: string; maxDepth: number }) => Promise<void>;
  };
}

interface ImportData {
  version: number;
  timestamp: number;
  chatId: string;
  nodes: Node[];
  connections: Connection[];
  canvas?: CanvasState;
}

/** Шаг размышления Council для отображения в Chat Panel */
export interface CouncilThinkingStep {
  id: string;
  stage: 'divergence' | 'convergence' | 'synthesis';
  agentId: string;
  agentName: string;
  providerId: ProviderId;
  modelId: string;
  input: string;
  output: string;
  timestamp: number;
  duration?: number;
  nodeId?: string;
}

export function useWorkspaceModel(): WorkspaceModel {
  const [canvas, setCanvas] = React.useState<CanvasState>(defaultCanvasState);
  const [model, setModel] = React.useState<string>('gpt-4.1');
  
  // History for Graph (Nodes + Connections)
  const { 
    state: graph, 
    set: setGraph, 
    setTransient: setGraphTransient, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    setHistory: initGraphHistory 
  } = useHistory<{ nodes: Node[]; connections: Connection[] }>({ nodes: [], connections: [] });

  const { showToast } = useToast();

  const [chats, setChats] = React.useState<ChatRecord[]>([]);
  const [currentChatId, setCurrentChatId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Multi-provider state
  const [providers, setProviders] = React.useState<ProviderConfig[]>([]);
  const [selectedCouncilId, setSelectedCouncilId] = React.useState<string | null>(null);
  
  // LLM Gateway instance
  const gateway = React.useMemo(() => getLLMGateway(), []);
  const councilEngine = React.useMemo(() => getCouncilEngine(), []);
  
  // Clipboard for copy/paste (must be at top level for hooks rules)
  const clipboardRef = React.useRef<{ nodes: Node[]; connections: Connection[] } | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        setIsLoading(true);
        const [storedCanvas, storedModel, storedChatId, existingChats, storedProviders] = await Promise.all([
          readSetting<CanvasState | undefined>('canvas_state'),
          readSetting<string | undefined>('settings_model'),
          readSetting<string | undefined>('current_chat_id'),
          readChats(),
          readSetting<ProviderConfig[] | undefined>('providers'),
        ]);

        if (cancelled) return;

        if (storedCanvas) setCanvas(storedCanvas);
        if (storedModel) setModel(storedModel);
        
        // Load and configure providers
        if (storedProviders && storedProviders.length > 0) {
          setProviders(storedProviders);
          storedProviders.forEach(config => gateway.configureProvider(config));
        }

        let activeChatId = storedChatId;
        let chatList = existingChats;

        if (chatList.length === 0) {
          const newChatId = `chat-${Date.now()}`;
          const newChat: ChatRecord = {
            id: newChatId,
            title: 'New Chat',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          
          await saveChat(newChat);
          chatList = [newChat];
          activeChatId = newChatId;

          const root: Node = {
            id: 'root',
            x: 100,
            y: 100,
            context: '',
            modelResponse: null,
            prompt: '',
            branchCount: 2,
            deepLevel: 1,
            isRoot: true,
            isPlaying: false,
            inputs: [],
            outputs: [],
          };
          await saveNodesByChat(newChatId, [root]);
          await saveConnectionsByChat(newChatId, []);
          
          // Initial history state
          initGraphHistory({ nodes: [root], connections: [] });
        }

        if (!activeChatId || !chatList.find(c => c.id === activeChatId)) {
          if (chatList.length > 0) activeChatId = chatList[0].id;
        }

        setChats(chatList);
        setCurrentChatId(activeChatId || null);

        if (activeChatId && chatList.length > 0) {
          const [nodesForChat, connsForChat] = await Promise.all([
            readNodesByChat<Node>(activeChatId),
            readConnectionsByChat<Connection>(activeChatId),
          ]);
          initGraphHistory({ nodes: nodesForChat, connections: connsForChat });
        }
      } catch (error) {
        console.error('Bootstrap error:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void bootstrap();
    return () => { cancelled = true; };
  }, [initGraphHistory]);

  // Combined save effect for nodes and connections (debounced)
  React.useEffect(() => {
    if (!currentChatId) return;
    setIsSaving(true);
    const timeoutId = setTimeout(async () => {
      try {
        await Promise.all([
          saveNodesByChat(currentChatId, graph.nodes),
          saveConnectionsByChat(currentChatId, graph.connections),
        ]);
      } finally {
        setIsSaving(false);
      }
    }, DEBOUNCE_SAVE_MS);
    return () => clearTimeout(timeoutId);
  }, [graph.nodes, graph.connections, currentChatId]);

  React.useEffect(() => {
    if (currentChatId) void saveSetting('current_chat_id', currentChatId);
  }, [currentChatId]);

  React.useEffect(() => {
    void saveSetting('canvas_state', canvas);
  }, [canvas]);

  React.useEffect(() => {
    void saveSetting('settings_model', model);
  }, [model]);

  const setTool = useCallback((tool: CanvasState['tool']) => {
    setCanvas((prev) => ({ ...prev, tool }));
  }, []);

  const changeZoom = useCallback((delta: number) => {
    setCanvas((prev) => {
      const nextZoom = Math.min(2, Math.max(0.25, prev.zoom + delta));
      return { ...prev, zoom: nextZoom };
    });
  }, []);

  const zoomAtPoint = useCallback((delta: number, clientX: number, clientY: number, canvasRect: DOMRect) => {
    setCanvas((prev) => {
      const oldZoom = prev.zoom;
      const newZoom = Math.min(2, Math.max(0.25, oldZoom + delta));
      if (newZoom === oldZoom) return prev;
      const mouseX = clientX - canvasRect.left;
      const mouseY = clientY - canvasRect.top;
      const contentX = mouseX / oldZoom - prev.offsetX;
      const contentY = mouseY / oldZoom - prev.offsetY;
      const newOffsetX = Math.max(-CANVAS_OFFSET_LIMIT, Math.min(CANVAS_OFFSET_LIMIT, mouseX / newZoom - contentX));
      const newOffsetY = Math.max(-CANVAS_OFFSET_LIMIT, Math.min(CANVAS_OFFSET_LIMIT, mouseY / newZoom - contentY));
      return { ...prev, zoom: newZoom, offsetX: newOffsetX, offsetY: newOffsetY };
    });
  }, []);

  const resetZoom = useCallback(() => {
    setCanvas((prev) => ({ ...prev, zoom: defaultCanvasState.zoom }));
  }, []);

  const panCanvas = useCallback((dx: number, dy: number) => {
    setCanvas((prev) => ({
      ...prev,
      offsetX: Math.max(-CANVAS_OFFSET_LIMIT, Math.min(CANVAS_OFFSET_LIMIT, prev.offsetX + dx)),
      offsetY: Math.max(-CANVAS_OFFSET_LIMIT, Math.min(CANVAS_OFFSET_LIMIT, prev.offsetY + dy)),
    }));
  }, []);

  const setSettingsModel = useCallback((next: string) => {
    setModel(next);
  }, []);

  const updateNodePosition = useCallback((id: string, x: number, y: number, isTransient = false) => {
    const setter = isTransient ? setGraphTransient : setGraph;
    setter((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => (node.id === id ? { ...node, x, y } : node)),
    }));
  }, [setGraph, setGraphTransient]);

  const updateNodePrompt = useCallback((id: string, prompt: string) => {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => (node.id === id ? { ...node, prompt } : node)),
    }));
  }, [setGraph]);

  const updateNodeBranchCount = useCallback((id: string, count: 1 | 2 | 3 | 4) => {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => (node.id === id ? { ...node, branchCount: count } : node)),
    }));
  }, [setGraph]);

  const updateNodeDeepLevel = useCallback((id: string, level: 1 | 2 | 3 | 4) => {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => (node.id === id ? { ...node, deepLevel: level } : node)),
    }));
  }, [setGraph]);

  const updateNodeModel = useCallback((id: string, modelId: string, providerId: ProviderId) => {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => (node.id === id ? { ...node, modelId, providerId } : node)),
    }));
  }, [setGraph]);

  const createChat = useCallback(async () => {
    const newChatId = `chat-${Date.now()}`;
    const newChat: ChatRecord = {
      id: newChatId,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const root: Node = {
      id: 'root',
      x: 100,
      y: 100,
      context: '',
      modelResponse: null,
      prompt: '',
      branchCount: 2,
      deepLevel: 1,
      isRoot: true,
      isPlaying: false,
      inputs: [],
      outputs: [],
    };
    await saveChat(newChat);
    await saveNodesByChat(newChatId, [root]);
    await saveConnectionsByChat(newChatId, []);
    setChats(prev => [newChat, ...prev]);
    
    // Switch context
    initGraphHistory({ nodes: [root], connections: [] });
    setCanvas(defaultCanvasState);
    setCurrentChatId(newChatId);
  }, [initGraphHistory]);

  const selectChat = useCallback(async (chatId: string) => {
    if (chatId === currentChatId) return;
    const [nodesForChat, connsForChat] = await Promise.all([
      readNodesByChat<Node>(chatId),
      readConnectionsByChat<Connection>(chatId),
    ]);
    initGraphHistory({ nodes: nodesForChat, connections: connsForChat });
    setCanvas(defaultCanvasState);
    setCurrentChatId(chatId);
  }, [currentChatId, initGraphHistory]);

  const deleteChatAction = useCallback(async (chatId: string) => {
    await deleteChat(chatId);
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      const remaining = chats.filter(c => c.id !== chatId);
      if (remaining.length > 0) {
        selectChat(remaining[0].id);
      } else {
        createChat();
      }
    }
  }, [chats, currentChatId, createChat, selectChat]);

  const clearData = useCallback(() => {
    if (!currentChatId) return;
    const root: Node = {
      id: 'root',
      x: 100,
      y: 100,
      context: '',
      modelResponse: null,
      prompt: '',
      branchCount: 2,
      deepLevel: 1,
      isRoot: true,
      isPlaying: false,
      inputs: [],
      outputs: [],
    };
    setGraph({ nodes: [root], connections: [] });
    setCanvas(defaultCanvasState);
  }, [currentChatId, setGraph]);

  // Helper function for recursive node execution
  const executeNodeRecursive = useCallback(async (
    nodeId: string,
    prompt: string,
    branchCount: 1 | 2 | 3 | 4,
    deepLevel: 1 | 2 | 3 | 4,
    parentX: number,
    parentY: number,
    apiKey: string,
    modelName: string
  ): Promise<void> => {
    if (!apiKey || !prompt) return;

    const now = Date.now();
    const childIds: string[] = [];

    // 1. Create child nodes structure
    const childX = parentX + NODE_WIDTH + NODE_GAP_X;
    const parentCenterY = parentY + NODE_HEIGHT / 2;
    const totalChildrenHeight = branchCount * NODE_HEIGHT + (branchCount - 1) * NODE_GAP_Y;
    const firstChildY = parentCenterY - totalChildrenHeight / 2;

    const createdNodes: Node[] = Array.from({ length: branchCount }).map((_, index) => {
      const childId = `${nodeId}-child-${now}-${index}`;
      childIds.push(childId);
      const childY = firstChildY + index * (NODE_HEIGHT + NODE_GAP_Y);
      return {
        id: childId,
        x: childX,
        y: childY,
        context: prompt,
        modelResponse: null,
        prompt: '',
        branchCount: 1 as const,
        deepLevel: 1 as const,
        isRoot: false,
        isPlaying: true,
        inputs: [],
        outputs: [],
      };
    });

    // 2. Add nodes to graph
    setGraph((prev) => {
      const newConnections: Connection[] = createdNodes.map((child, index) => ({
        id: `conn-${child.id}`,
        fromNodeId: nodeId,
        fromPortIndex: index,
        toNodeId: child.id,
        toPortIndex: 0,
        providerId: 'openai',
        color: PROVIDER_COLORS['openai'],
      }));

      const existingConnIds = new Set(prev.connections.map((c) => c.id));
      const uniqueNewConns = newConnections.filter((c) => !existingConnIds.has(c.id));

      return {
        nodes: [...prev.nodes, ...createdNodes],
        connections: [...prev.connections, ...uniqueNewConns],
      };
    });

    // 3. LLM Call (via Gateway)
    try {
      // Legacy path uses explicit apiKey. Configure OpenAI provider in-memory for this run.
      gateway.configureProvider({
        id: 'openai',
        name: 'OpenAI',
        apiKey,
        isEnabled: true,
      });

      const multi = await gateway.queryMultiple({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        n: branchCount,
      });

      const choices = multi.choices
        .slice(0, branchCount)
        .map((choice) => ({
          message: {
            content: choice.content,
          },
        }));

      // 4. Build recursive call data from createdNodes and API responses
      const recursiveCallsData: Array<{
        childId: string;
        childPrompt: string;
        childX: number;
        childY: number;
      }> = [];

      // Process each child node with its response
      createdNodes.forEach((createdNode, index) => {
        const choice = choices[index];
        const content = choice?.message?.content ?? '';
        const responseText = typeof content === 'string' ? content : String(content);

        if (deepLevel > 1) {
          const childPrompt = `Продолжи и углуби этот ответ: ${responseText.slice(0, 200)}...`;
          recursiveCallsData.push({
            childId: createdNode.id,
            childPrompt,
            childX: createdNode.x,
            childY: createdNode.y,
          });
        }
      });

      // 5. Update nodes with responses
      setGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((node) => {
          const childIndex = childIds.indexOf(node.id);
          if (childIndex === -1) return node;

          const choice = choices[childIndex];
          const content = choice?.message?.content ?? '';
          const responseText = typeof content === 'string' ? content : String(content);

          return {
            ...node,
            modelResponse: responseText,
            isPlaying: deepLevel > 1, // Keep playing if we'll recurse
            prompt: deepLevel > 1 ? `Продолжи и углуби этот ответ: ${responseText.slice(0, 200)}...` : '',
            // Store provider info for visual differentiation
            providerId: 'openai' as const,
            modelId: modelName,
            type: 'standard' as const,
          };
        }),
      }));

      // 6. Recursive calls with captured data (not from state)
      if (deepLevel > 1 && recursiveCallsData.length > 0) {
        const nextDeepLevel = Math.max(1, deepLevel - 1) as 1 | 2 | 3 | 4;
        
        await Promise.all(recursiveCallsData.map(async ({ childId, childPrompt, childX, childY }) => {
          await executeNodeRecursive(
            childId,
            childPrompt,
            1, // branchCount for recursive calls
            nextDeepLevel,
            childX,
            childY,
            apiKey,
            modelName
          );
        }));

        // Mark nodes as done playing after recursion completes
        setGraph((prev) => ({
          ...prev,
          nodes: prev.nodes.map((node) => {
            if (childIds.includes(node.id)) {
              return { ...node, isPlaying: false };
            }
            return node;
          }),
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка выполнения';
      showToast(errorMessage, 'error');
      setGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((node) => {
          if (childIds.includes(node.id)) {
            return { ...node, isPlaying: false, modelResponse: `⚠️ ${errorMessage}`, error: errorMessage };
          }
          return node;
        }),
      }));
    }
  }, [setGraph, showToast]);

  const playNode = useCallback(async ({ nodeId, apiKey, model: defaultModel }: { nodeId: string; apiKey: string; model: string }) => {
    // Get source node data from current state
    const source = graph.nodes.find((n) => n.id === nodeId);
    if (!source || !apiKey) return;
    if (!source.prompt.trim()) {
      showToast('Введите промпт перед запуском', 'error');
      return;
    }

    // Use node's model if set, otherwise use default
    const modelToUse = source.modelId || defaultModel;

    await executeNodeRecursive(
      nodeId,
      source.prompt,
      source.branchCount,
      source.deepLevel,
      source.x,
      source.y,
      apiKey,
      modelToUse
    );
  }, [graph.nodes, executeNodeRecursive, showToast]);

  const deleteNode = useCallback((nodeId: string) => {
    setGraph((prev) => {
      const nodesToDelete = new Set<string>();
      const stack = [nodeId];
      
      while (stack.length > 0) {
        const currentId = stack.pop()!;
        if (nodesToDelete.has(currentId)) continue;
        nodesToDelete.add(currentId);
        // Добавляем детей (ветви) для удаления
        prev.nodes
          .filter(n => n.inputs.some(input => input.nodeId === currentId))
          .forEach(child => stack.push(child.id));
      }

      return {
        ...prev,
        nodes: prev.nodes.filter(node => !nodesToDelete.has(node.id)),
        connections: prev.connections.filter(conn => 
          !nodesToDelete.has(conn.fromNodeId) && 
          !nodesToDelete.has(conn.toNodeId)
        ),
      };
    });
  }, [setGraph]);

  const duplicateNode = useCallback((nodeId: string) => {
    const nodeToDuplicate = graph.nodes.find((n) => n.id === nodeId);
    if (!nodeToDuplicate) return;

    const clonedInputs = (nodeToDuplicate.inputs || []).map((input) => ({
      ...input,
      id: crypto.randomUUID(),
      nodeId: '', // will set after node creation
    }));
    const clonedOutputs = (nodeToDuplicate.outputs || []).map((output) => ({
      ...output,
      id: crypto.randomUUID(),
      nodeId: '', // will set after node creation
    }));

    const newNodeId = crypto.randomUUID();
    const newNode: Node = {
      ...nodeToDuplicate,
      id: newNodeId,
      x: nodeToDuplicate.x + 50,
      y: nodeToDuplicate.y + 50,
      isRoot: false,
      isPlaying: false,
      modelResponse: nodeToDuplicate.modelResponse,
      context: nodeToDuplicate.context,
      prompt: nodeToDuplicate.prompt,
      inputs: clonedInputs.map((i) => ({ ...i, nodeId: newNodeId })),
      outputs: clonedOutputs.map((o) => ({ ...o, nodeId: newNodeId })),
    };

    setGraph((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
  }, [graph.nodes, setGraph]);

  const copyNodes = useCallback((nodeIds: string[]) => {
    if (nodeIds.length === 0) return;
    
    const nodesToCopy = graph.nodes.filter(n => nodeIds.includes(n.id));
    const nodeIdSet = new Set(nodeIds);
    
    // Copy connections between selected nodes
    const connectionsToCopy = graph.connections.filter(
      c => nodeIdSet.has(c.fromNodeId) && nodeIdSet.has(c.toNodeId)
    );
    
    clipboardRef.current = {
      nodes: nodesToCopy,
      connections: connectionsToCopy,
    };
    
    showToast(`Скопировано ${nodesToCopy.length} нод`, 'success');
  }, [graph.nodes, graph.connections, showToast]);

  const pasteNodes = useCallback(() => {
    if (!clipboardRef.current || clipboardRef.current.nodes.length === 0) {
      showToast('Буфер обмена пуст', 'error');
      return;
    }
    
    const { nodes: copiedNodes, connections: copiedConnections } = clipboardRef.current;
    
    // Create ID mapping for new nodes
    const idMap = new Map<string, string>();
    const offset = 100; // Offset for pasted nodes
    
    const newNodes: Node[] = copiedNodes.map(node => {
      const newId = crypto.randomUUID();
      idMap.set(node.id, newId);
      return {
        ...node,
        id: newId,
        x: node.x + offset,
        y: node.y + offset,
        isRoot: false,
        isPlaying: false,
      };
    });
    
    // Remap connections to new node IDs
    const newConnections: Connection[] = copiedConnections.map(conn => ({
      ...conn,
      id: crypto.randomUUID(),
      fromNodeId: idMap.get(conn.fromNodeId) || conn.fromNodeId,
      toNodeId: idMap.get(conn.toNodeId) || conn.toNodeId,
    }));
    
    setGraph(prev => ({
      ...prev,
      nodes: [...prev.nodes, ...newNodes],
      connections: [...prev.connections, ...newConnections],
    }));
    
    showToast(`Вставлено ${newNodes.length} нод`, 'success');
  }, [setGraph, showToast]);

  // Auto-layout all nodes in tree structure
  const autoLayout = useCallback(() => {
    if (graph.nodes.length === 0) return;
    
    const result = autoLayoutNodes(graph.nodes, graph.connections, {
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
      horizontalGap: NODE_GAP_X,
      verticalGap: NODE_GAP_Y,
    });
    
    setGraph(prev => ({
      ...prev,
      nodes: result.nodes,
    }));
    
    showToast('Граф автоматически организован', 'success');
  }, [graph.nodes, graph.connections, setGraph, showToast]);

  // Arrange selected nodes in grid
  const arrangeSelectedInGrid = useCallback((nodeIds: string[]) => {
    if (nodeIds.length === 0) return;
    
    const selectedNodes = graph.nodes.filter(n => nodeIds.includes(n.id));
    const arrangedNodes = arrangeInGrid(selectedNodes, {
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
      horizontalGap: NODE_GAP_X,
      verticalGap: NODE_GAP_Y,
    });
    
    const arrangedMap = new Map(arrangedNodes.map(n => [n.id, n]));
    
    setGraph(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => arrangedMap.get(n.id) || n),
    }));
    
    showToast(`${arrangedNodes.length} нод организовано в сетку`, 'success');
  }, [graph.nodes, setGraph, showToast]);

  const exportChat = useCallback(() => {
    if (!currentChatId) return;
    const data = {
      version: 1,
      timestamp: Date.now(),
      chatId: currentChatId,
      nodes: graph.nodes,
      connections: graph.connections,
      canvas, 
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tension-chat-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentChatId, graph, canvas]);

  const importChat = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ImportData;
      
      if (!Array.isArray(data.nodes) || !Array.isArray(data.connections)) {
        throw new Error('Invalid format: nodes or connections array missing');
      }

      if (data.nodes.length > 0) {
        const n = data.nodes[0];
        if (!n.id || typeof n.x !== 'number' || typeof n.y !== 'number') {
           throw new Error('Invalid node format: missing id or coordinates');
        }
      }

      const newChatId = `chat-import-${Date.now()}`;
      const newChat: ChatRecord = {
        id: newChatId,
        title: `Imported ${new Date().toLocaleTimeString()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const importedNodes = data.nodes.map((n) => ({ ...n, chatId: newChatId }));
      const importedConnections = data.connections.map((c) => ({ ...c, chatId: newChatId }));

      await saveChat(newChat);
      await saveNodesByChat(newChatId, importedNodes);
      await saveConnectionsByChat(newChatId, importedConnections);

      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChatId);
      
      initGraphHistory({ nodes: importedNodes, connections: importedConnections });
      
      if (data.canvas) {
         setCanvas(data.canvas);
      } else {
         setCanvas(defaultCanvasState);
      }

      showToast('Chat imported successfully', 'success');
    } catch (e) {
      console.error('Import failed', e);
      showToast('Import failed: ' + (e instanceof Error ? e.message : String(e)), 'error');
    }
  }, [initGraphHistory, showToast]);

  const centerCanvas = useCallback(() => {
    if (graph.nodes.length === 0) {
      setCanvas((prev) => ({ ...prev, offsetX: 0, offsetY: 0, zoom: 1 }));
      return;
    }
    const xs = graph.nodes.map(n => n.x);
    const ys = graph.nodes.map(n => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + NODE_WIDTH;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys) + NODE_HEIGHT;
    const viewportW = window.innerWidth - SIDEBAR_WIDTH - SIDEBAR_PADDING; 
    const viewportH = window.innerHeight - 100; // Account for toolbar
    const contentPadding = 200;
    const contentW = maxX - minX + contentPadding; 
    const contentH = maxY - minY + contentPadding;
    const fitZoom = Math.min(Math.max(Math.min(viewportW / contentW, viewportH / contentH), 0.25), 1.5);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setCanvas(prev => ({
      ...prev,
      zoom: fitZoom,
      offsetX: (viewportW / 2) / fitZoom - centerX,
      offsetY: (viewportH / 2) / fitZoom - centerY,
    }));
  }, [graph.nodes]);

  // Center canvas on a specific node
  const centerOnNode = useCallback((nodeId: string) => {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const viewportW = window.innerWidth - SIDEBAR_WIDTH - SIDEBAR_PADDING;
    const viewportH = window.innerHeight - 100;
    
    // Center the node in the viewport
    const nodeCenterX = node.x + NODE_WIDTH / 2;
    const nodeCenterY = node.y + NODE_HEIGHT / 2;
    
    setCanvas(prev => ({
      ...prev,
      offsetX: (viewportW / 2) / prev.zoom - nodeCenterX,
      offsetY: (viewportH / 2) / prev.zoom - nodeCenterY,
    }));
  }, [graph.nodes]);

  // Provider management
  const updateProvider = useCallback((config: ProviderConfig) => {
    setProviders((prev) => {
      const existing = prev.findIndex((p) => p.id === config.id);
      const nextProviders = existing >= 0
        ? prev.map((p, index) => (index === existing ? config : p))
        : [...prev, config];

      // Persist exactly what we set (avoid stale closures)
      void saveSetting('providers', nextProviders);
      return nextProviders;
    });
    
    // Configure gateway
    gateway.configureProvider(config);
  }, [gateway]);
  
  const testProvider = useCallback(async (providerId: ProviderId): Promise<boolean> => {
    return gateway.testProvider(providerId);
  }, [gateway]);
  
  const selectCouncil = useCallback((councilId: string | null) => {
    setSelectedCouncilId(councilId);
  }, []);
  
  // Council execution
  const playCouncil = useCallback(async (params: { nodeId: string; councilId: string; onThinkingStep?: (step: CouncilThinkingStep) => void; silent?: boolean }) => {
    const { nodeId, councilId, onThinkingStep, silent = false } = params;
    const council = getCouncilById(councilId);
    if (!council) {
      if (!silent) {
        showToast('Council not found', 'error');
      }
      return;
    }
    
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const prompt = node.prompt || node.context;
    if (!prompt.trim()) {
      if (!silent) {
        showToast('Введите запрос', 'error');
      }
      return;
    }
    
    // Set node to playing state
    setGraph(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => 
        n.id === nodeId ? { ...n, isPlaying: true, error: undefined } : n
      ),
    }));
    
    try {
      const result = await councilEngine.execute(council, prompt, (progress) => {
        // Keep console noise out of prod builds.
        if (import.meta.env.DEV) {
          console.debug(`Council ${progress.stageName}: ${progress.progress}%`);
        }
      });

      // Emit thinking steps to UI if requested
      if (onThinkingStep) {
        const steps: CouncilThinkingStep[] = [];
        let timestamp = Date.now();

        // Stage 1: divergence — ответы всех членов совета
        result.stage1.responses.forEach((response, index) => {
          const member = council.members[index];
          steps.push({
            id: crypto.randomUUID(),
            stage: 'divergence',
            agentId: member?.modelId ?? `member-${index}`,
            agentName: member?.modelId ?? `Model ${index + 1}`,
            providerId: member?.provider ?? response.provider,
            modelId: response.modelId,
            input: prompt,
            output: response.error ? `⚠️ ${response.error}` : response.content,
            timestamp,
            duration: response.latencyMs,
            nodeId,
          });
          timestamp += 10;
        });

        // Stage 2: convergence — агрегированный рейтинг ответов
        if (result.stage2 && result.stage2.scores?.length) {
          const bestIndex = result.stage2.aggregatedRanking[0] ?? 0;
          const bestResponse = result.stage1.responses[bestIndex];
          const scoresText = result.stage2.scores
            .map((score, i) => `- ${result.stage1.responses[i].modelId}: ${score}/100`)
            .join('\n');

          steps.push({
            id: crypto.randomUUID(),
            stage: 'convergence',
            agentId: 'evaluators',
            agentName: 'Evaluators',
            providerId: council.members[0]?.provider ?? result.stage1.responses[0]?.provider,
            modelId: bestResponse?.modelId ?? 'multi',
            input: 'Оценка и ранжирование ответов экспертов',
            output: `Лучший ответ: ${bestResponse?.modelId ?? 'N/A'}\nСогласие: ${result.stage2.agreementScore}%\n\nОценки:\n${scoresText}`,
            timestamp,
            nodeId,
          });
          timestamp += 10;
        }

        // Stage 3: synthesis — финальный ответ председателя
        steps.push({
          id: crypto.randomUUID(),
          stage: 'synthesis',
          agentId: council.chairman.modelId,
          agentName: 'Chairman',
          providerId: council.chairman.provider,
          modelId: council.chairman.modelId,
          input: 'Синтез ответов и оценок',
          output: result.stage3.finalResponse,
          timestamp,
          duration: result.stage3.latencyMs,
          nodeId,
        });

        steps.forEach((step) => onThinkingStep(step));
      }

      // Update node with council result
      setGraph(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => 
          n.id === nodeId ? { 
            ...n, 
            isPlaying: false,
            modelResponse: result.stage3.finalResponse,
            // Store council metadata in context for display
            context: `[Council: ${council.name}] Confidence: ${result.stage3.confidence}%\n\n${prompt}`,
          } : n
        ),
      }));
      
      if (!silent) {
        showToast(`Council завершён! Confidence: ${result.stage3.confidence}%`, 'success');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Council error';
      setGraph(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => 
          n.id === nodeId ? { ...n, isPlaying: false, error: errorMessage } : n
        ),
      }));
      if (!silent) {
        showToast(errorMessage, 'error');
      }
    }
  }, [graph.nodes, councilEngine, setGraph, showToast]);

  const { councilPlan, startCouncilPlan } = useCouncilPlan({
    graph,
    selectedCouncilId,
    playCouncil,
    showToast,
  });

  // Multi-model branching: each branch uses a different model
  const playMultiModel = useCallback(async (params: { 
    nodeId: string; 
    models: { modelId: string; providerId: ProviderId }[] 
  }) => {
    const { nodeId, models } = params;
    const source = graph.nodes.find(n => n.id === nodeId);
    if (!source) return;
    
    const prompt = source.prompt || source.context;
    if (!prompt.trim()) {
      showToast('Введите запрос', 'error');
      return;
    }
    
    // Create child nodes for each model
    const childNodes: Node[] = models.map((model, index) => {
      const angle = (index / models.length) * Math.PI - Math.PI / 2;
      const radius = 400;
      const x = source.x + Math.cos(angle) * radius;
      const y = source.y + NODE_HEIGHT + 100 + Math.sin(angle) * radius * 0.5;
      
      return {
        id: crypto.randomUUID(),
        x,
        y,
        context: prompt,
        modelResponse: null,
        prompt: '',
        branchCount: 1 as const,
        deepLevel: 1 as const,
        isRoot: false,
        isPlaying: true,
        inputs: [{ id: crypto.randomUUID(), nodeId: '', type: 'input' as const, dataType: 'text' as const, index: 0 }],
        outputs: [{ id: crypto.randomUUID(), nodeId: '', type: 'output' as const, dataType: 'text' as const, index: 0 }],
        modelId: model.modelId,
        providerId: model.providerId,
        type: 'standard' as const,
      };
    });
    
    // Update node IDs in ports
    childNodes.forEach(node => {
      node.inputs[0].nodeId = node.id;
      node.outputs[0].nodeId = node.id;
    });
    
    // Create connections from source to children
    const newConnections: Connection[] = childNodes.map(child => {
      const providerColor = child.providerId ? PROVIDER_COLORS[child.providerId] : undefined;
      return {
        id: crypto.randomUUID(),
        fromNodeId: source.id,
        fromPortIndex: 0,
        toNodeId: child.id,
        toPortIndex: 0,
        providerId: child.providerId,
        color: providerColor ?? 'var(--connection-stroke)',
      };
    });
    
    // Add nodes and connections
    setGraph(prev => ({
      ...prev,
      nodes: [...prev.nodes, ...childNodes],
      connections: [...prev.connections, ...newConnections],
    }));
    
    // Execute each model in parallel
    const results = await Promise.allSettled(
      childNodes.map(async (child) => {
        try {
          // Get API key for the provider
          const provider = providers.find(p => p.id === child.providerId);
          if (!provider?.apiKey) {
            throw new Error(`No API key for ${child.providerId}`);
          }
          
          const response = await gateway.query({
            model: child.modelId!,
            messages: [{ role: 'user' as const, content: prompt }],
          });
          
          if (response.error) {
            throw new Error(response.error);
          }
          
          return { nodeId: child.id, response: response.content };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error';
          return { nodeId: child.id, error: errorMessage };
        }
      })
    );
    
    // Update nodes with results
    setGraph(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => {
        const result = results.find((r, i) => 
          r.status === 'fulfilled' && childNodes[i].id === node.id
        );
        
        if (result && result.status === 'fulfilled') {
          const value = result.value as { nodeId: string; response?: string; error?: string };
          if (value.nodeId === node.id) {
            return {
              ...node,
              isPlaying: false,
              modelResponse: value.response || `⚠️ ${value.error}`,
              error: value.error,
            };
          }
        }
        return node;
      }),
    }));
    
    showToast(`Multi-model: ${models.length} ответов получено`, 'success');
  }, [graph.nodes, providers, gateway, setGraph, showToast]);

  const state: WorkspaceState = {
    canvas,
    settings: { model },
    nodes: graph.nodes,
    connections: graph.connections,
    chats,
    currentChatId,
    isSaving,
    isLoading,
    canUndo,
    canRedo,
    providers,
    selectedCouncilId,
    councilPlan,
  };

  return {
    state,
    actions: {
      setTool,
      changeZoom,
      zoomAtPoint,
      resetZoom,
      centerCanvas,
      centerOnNode,
      panCanvas,
      setSettingsModel,
      updateNodePosition,
      updateNodePrompt,
      updateNodeBranchCount,
      updateNodeDeepLevel,
      updateNodeModel,
      playNode,
      clearData,
      createChat,
      selectChat,
      deleteChat: deleteChatAction,
      deleteNode,
      duplicateNode,
      copyNodes,
      pasteNodes,
      autoLayout,
      arrangeSelectedInGrid,
      exportChat,
      importChat,
      undo,
      redo,
      // Multi-provider actions
      updateProvider,
      testProvider,
      selectCouncil,
      playCouncil,
      playMultiModel,
      startCouncilPlan,
    },
  };
}
