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
import { NODE_WIDTH, NODE_HEIGHT, NODE_GAP_X, NODE_GAP_Y } from '@/shared/config/constants';
import { useHistory } from '@/shared/lib/hooks/useHistory';
import { useToast } from '@/shared/lib/contexts/ToastContext';

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
}

export interface WorkspaceModel {
  state: WorkspaceState;
  actions: {
    setTool: (tool: CanvasState['tool']) => void;
    changeZoom: (delta: number) => void;
    zoomAtPoint: (delta: number, clientX: number, clientY: number, canvasRect: DOMRect) => void;
    resetZoom: () => void;
    centerCanvas: () => void;
    panCanvas: (dx: number, dy: number) => void;
    setSettingsModel: (model: string) => void;
    updateNodePosition: (id: string, x: number, y: number, isTransient?: boolean) => void;
    updateNodePrompt: (id: string, prompt: string) => void;
    updateNodeBranchCount: (id: string, count: 1 | 2 | 3 | 4) => void;
    updateNodeDeepLevel: (id: string, level: 1 | 2 | 3 | 4) => void;
    playNode: (params: { nodeId: string; apiKey: string; model: string }) => Promise<void>;
    clearData: () => void;
    createChat: () => Promise<void>;
    selectChat: (chatId: string) => Promise<void>;
    deleteChat: (chatId: string) => Promise<void>;
    deleteNode: (nodeId: string) => void;
    duplicateNode: (nodeId: string) => void;
    exportChat: () => void;
    importChat: (file: File) => Promise<void>;
    undo: () => void;
    redo: () => void;
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

  React.useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        setIsLoading(true);
        const [storedCanvas, storedModel, storedChatId, existingChats] = await Promise.all([
          readSetting<CanvasState | undefined>('canvas_state'),
          readSetting<string | undefined>('settings_model'),
          readSetting<string | undefined>('current_chat_id'),
          readChats(),
        ]);

        if (cancelled) return;

        if (storedCanvas) setCanvas(storedCanvas);
        if (storedModel) setModel(storedModel);

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

  React.useEffect(() => {
    if (!currentChatId) return;
    setIsSaving(true);
    const timeoutId = setTimeout(async () => {
      await saveNodesByChat(currentChatId, graph.nodes);
      setIsSaving(false);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [graph.nodes, currentChatId]);

  React.useEffect(() => {
    if (!currentChatId) return;
    setIsSaving(true);
    const timeoutId = setTimeout(async () => {
      await saveConnectionsByChat(currentChatId, graph.connections);
      setIsSaving(false);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [graph.connections, currentChatId]);

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
    const MAX_OFFSET = 5000;
    setCanvas((prev) => {
      const oldZoom = prev.zoom;
      const newZoom = Math.min(2, Math.max(0.25, oldZoom + delta));
      if (newZoom === oldZoom) return prev;
      const mouseX = clientX - canvasRect.left;
      const mouseY = clientY - canvasRect.top;
      const contentX = mouseX / oldZoom - prev.offsetX;
      const contentY = mouseY / oldZoom - prev.offsetY;
      const newOffsetX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, mouseX / newZoom - contentX));
      const newOffsetY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, mouseY / newZoom - contentY));
      return { ...prev, zoom: newZoom, offsetX: newOffsetX, offsetY: newOffsetY };
    });
  }, []);

  const resetZoom = useCallback(() => {
    setCanvas((prev) => ({ ...prev, zoom: defaultCanvasState.zoom }));
  }, []);

  const panCanvas = useCallback((dx: number, dy: number) => {
    const MAX_OFFSET = 5000;
    setCanvas((prev) => ({
      ...prev,
      offsetX: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, prev.offsetX + dx)),
      offsetY: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, prev.offsetY + dy)),
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

  const playNode = useCallback(async ({ nodeId, apiKey, model: modelName }: { nodeId: string; apiKey: string; model: string }) => {
    // 1. Prepare
    const source = graph.nodes.find((n) => n.id === nodeId);
    if (!source || !apiKey) return;

    const branchCount = source.branchCount;
    const deepLevel = source.deepLevel;
    const now = Date.now();
    const childIds: string[] = [];

    // 2. Optimistic Update (Create structure)
    setGraph((prev) => {
      const parentIndex = prev.nodes.findIndex((n) => n.id === nodeId);
      if (parentIndex === -1) return prev;
      const parent = prev.nodes[parentIndex];
      const newNodes = [...prev.nodes];
      
      const childX = parent.x + NODE_WIDTH + NODE_GAP_X;
      const parentCenterY = parent.y + NODE_HEIGHT / 2;
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
          context: source.prompt,
          modelResponse: null,
          prompt: '',
          branchCount: 1, 
          deepLevel: 1,
          isRoot: false,
          isPlaying: true,
          inputs: [],
          outputs: [],
        };
      });

      newNodes.push(...createdNodes);

      const newConnections: Connection[] = createdNodes.map((child, index) => ({
        id: `conn-${child.id}`,
        fromNodeId: nodeId,
        fromPortIndex: index,
        toNodeId: child.id,
        toPortIndex: 0,
      }));

      const existingConnIds = new Set(prev.connections.map((c) => c.id));
      const uniqueNewConns = newConnections.filter((c) => !existingConnIds.has(c.id));

      return {
        nodes: newNodes,
        connections: [...prev.connections, ...uniqueNewConns],
      };
    });

    // 3. API Call
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          n: branchCount,
          messages: [{ role: 'user', content: source.prompt }],
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
      const data = await response.json();
      const choices = (data.choices ?? []).slice(0, branchCount);

      // 4. Update with Response
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
            isPlaying: false,
            prompt: deepLevel > 1 ? `Продолжи и углуби этот ответ: ${responseText.slice(0, 200)}...` : '',
            branchCount: deepLevel > 1 ? 1 : node.branchCount,
            deepLevel: deepLevel > 1 ? Math.max(1, deepLevel - 1) as 1 | 2 | 3 | 4 : 1,
          };
        }),
      }));

      // 5. Recursive Call
      if (deepLevel > 1) {
        // Need to wait a bit or just trigger?
        // Note: playNode is async, but we don't want to block UI. 
        // Using void to fire and forget recursive branches? 
        // Or await to track completion?
        await Promise.all(childIds.map(async (childId) => {
          await playNode({ nodeId: childId, apiKey, model: modelName });
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
  }, [graph.nodes, setGraph, showToast]); // Careful with deps here

  const deleteNode = useCallback((nodeId: string) => {
    setGraph((prev) => {
      const nodesToDelete = new Set<string>();
      const stack = [nodeId];
      // Build dependency graph from current connections to find descendants
      // Optimization: Build adjacency list once?
      // Given size, simple traversal is fine.
      
      const allConnections = prev.connections;
      
      while (stack.length > 0) {
        const currentId = stack.pop()!;
        if (nodesToDelete.has(currentId)) continue;
        nodesToDelete.add(currentId);
        
        const children = allConnections
          .filter(c => c.fromNodeId === currentId)
          .map(c => c.toNodeId);
        stack.push(...children);
      }

      return {
        nodes: prev.nodes.filter(n => !nodesToDelete.has(n.id)),
        connections: prev.connections.filter(c => 
          !nodesToDelete.has(c.fromNodeId) && !nodesToDelete.has(c.toNodeId)
        ),
      };
    });
  }, [setGraph]);

  const duplicateNode = useCallback((nodeId: string) => {
    setGraph((prev) => {
      const nodeToDuplicate = prev.nodes.find((n) => n.id === nodeId);
      if (!nodeToDuplicate) return prev;

      const newNode: Node = {
        ...nodeToDuplicate,
        id: crypto.randomUUID(),
        x: nodeToDuplicate.x + 50,
        y: nodeToDuplicate.y + 50,
        isRoot: false,
        isPlaying: false,
        modelResponse: nodeToDuplicate.modelResponse,
        context: nodeToDuplicate.context,
        prompt: nodeToDuplicate.prompt,
      };

      return {
        ...prev,
        nodes: [...prev.nodes, newNode],
      };
    });
  }, [setGraph]);

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
      const data = JSON.parse(text);
      
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const importedNodes = (data.nodes as any[]).map((n) => ({ ...n, chatId: newChatId })) as Node[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const importedConnections = (data.connections as any[]).map((c) => ({ ...c, chatId: newChatId })) as Connection[];

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
    const viewportW = window.innerWidth - 300; 
    const viewportH = window.innerHeight - 100;
    const contentW = maxX - minX + 200; 
    const contentH = maxY - minY + 200;
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
  };

  return {
    state,
    actions: {
      setTool,
      changeZoom,
      zoomAtPoint,
      resetZoom,
      centerCanvas,
      panCanvas,
      setSettingsModel,
      updateNodePosition,
      updateNodePrompt,
      updateNodeBranchCount,
      updateNodeDeepLevel,
      playNode,
      clearData,
      createChat,
      selectChat,
      deleteChat: deleteChatAction,
      deleteNode,
      duplicateNode,
      exportChat,
      importChat,
      undo,
      redo,
    },
  };
}
