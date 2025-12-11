import React from 'react';
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

export interface WorkspaceState {
  canvas: CanvasState;
  settings: Settings;
  nodes: Node[];
  connections: Connection[];
  chats: ChatRecord[];
  currentChatId: string | null;
  isSaving: boolean;
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
    updateNodePosition: (id: string, x: number, y: number) => void;
    updateNodePrompt: (id: string, prompt: string) => void;
    updateNodeBranchCount: (id: string, count: 1 | 2 | 3 | 4) => void;
    updateNodeDeepLevel: (id: string, level: 1 | 2 | 3 | 4) => void;
    playNode: (params: { nodeId: string; apiKey: string; model: string }) => Promise<void>;
    clearData: () => void;
    createChat: () => Promise<void>;
    selectChat: (chatId: string) => Promise<void>;
    deleteChat: (chatId: string) => Promise<void>;
    deleteNode: (nodeId: string) => void;
    exportChat: () => void;
    importChat: (file: File) => Promise<void>;
  };
}

export function useWorkspaceModel(): WorkspaceModel {
  const [canvas, setCanvas] = React.useState<CanvasState>(defaultCanvasState);
  const [model, setModel] = React.useState<string>('gpt-4.1');
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [connections, setConnections] = React.useState<Connection[]>([]);
  const [chats, setChats] = React.useState<ChatRecord[]>([]);
  const [currentChatId, setCurrentChatId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
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
        }

        if (!activeChatId || !chatList.find(c => c.id === activeChatId)) {
          if (chatList.length > 0) activeChatId = chatList[0].id;
        }

        setChats(chatList);
        setCurrentChatId(activeChatId || null);

        if (activeChatId) {
          const [nodesForChat, connsForChat] = await Promise.all([
            readNodesByChat<Node>(activeChatId),
            readConnectionsByChat<Connection>(activeChatId),
          ]);
          setNodes(nodesForChat);
          setConnections(connsForChat);
        }
      } catch (error) {
        console.error('Bootstrap error:', error);
      }
    };

    void bootstrap();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (!currentChatId) return;
    setIsSaving(true);
    const timeoutId = setTimeout(async () => {
      await saveNodesByChat(currentChatId, nodes);
      setIsSaving(false);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [nodes, currentChatId]);

  React.useEffect(() => {
    if (!currentChatId) return;
    setIsSaving(true);
    const timeoutId = setTimeout(async () => {
      await saveConnectionsByChat(currentChatId, connections);
      setIsSaving(false);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [connections, currentChatId]);

  React.useEffect(() => {
    if (currentChatId) void saveSetting('current_chat_id', currentChatId);
  }, [currentChatId]);

  React.useEffect(() => {
    void saveSetting('canvas_state', canvas);
  }, [canvas]);

  React.useEffect(() => {
    void saveSetting('settings_model', model);
  }, [model]);

  const setTool = (tool: CanvasState['tool']) => {
    setCanvas((prev) => ({ ...prev, tool }));
  };

  const changeZoom = (delta: number) => {
    setCanvas((prev) => {
      const nextZoom = Math.min(2, Math.max(0.25, prev.zoom + delta));
      return { ...prev, zoom: nextZoom };
    });
  };

  const zoomAtPoint = (delta: number, clientX: number, clientY: number, canvasRect: DOMRect) => {
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
  };

  const resetZoom = () => {
    setCanvas((prev) => ({ ...prev, zoom: defaultCanvasState.zoom }));
  };

  const panCanvas = (dx: number, dy: number) => {
    const MAX_OFFSET = 5000;
    setCanvas((prev) => ({
      ...prev,
      offsetX: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, prev.offsetX + dx)),
      offsetY: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, prev.offsetY + dy)),
    }));
  };

  const setSettingsModel = (next: string) => {
    setModel(next);
  };

  const updateNodePosition = (id: string, x: number, y: number) => {
    setNodes((prev) => prev.map((node) => (node.id === id ? { ...node, x, y } : node)));
  };

  const updateNodePrompt = (id: string, prompt: string) => {
    setNodes((prev) => prev.map((node) => (node.id === id ? { ...node, prompt } : node)));
  };

  const updateNodeBranchCount = (id: string, count: 1 | 2 | 3 | 4) => {
    setNodes((prev) => prev.map((node) => (node.id === id ? { ...node, branchCount: count } : node)));
  };

  const updateNodeDeepLevel = (id: string, level: 1 | 2 | 3 | 4) => {
    setNodes((prev) => prev.map((node) => (node.id === id ? { ...node, deepLevel: level } : node)));
  };

  const createChat = async () => {
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
    setNodes([root]);
    setConnections([]);
    setCanvas(defaultCanvasState);
    setCurrentChatId(newChatId);
  };

  const selectChat = async (chatId: string) => {
    if (chatId === currentChatId) return;
    const [nodesForChat, connsForChat] = await Promise.all([
      readNodesByChat<Node>(chatId),
      readConnectionsByChat<Connection>(chatId),
    ]);
    setNodes(nodesForChat);
    setConnections(connsForChat);
    setCanvas(defaultCanvasState);
    setCurrentChatId(chatId);
  };

  const deleteChatAction = async (chatId: string) => {
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
  };

  const clearData = () => {
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
    setNodes([root]);
    setConnections([]);
    setCanvas(defaultCanvasState);
  };

  const playNode = async ({ nodeId, apiKey, model: modelName }: { nodeId: string; apiKey: string; model: string }) => {
    const source = await new Promise<Node | undefined>((resolve) => {
      setNodes((prev) => {
        const found = prev.find((n) => n.id === nodeId);
        resolve(found);
        return prev;
      });
    });
    
    if (!source || !apiKey) return;

    const branchCount = source.branchCount;
    const deepLevel = source.deepLevel;
    const now = Date.now();

    const childIds: string[] = [];
    
    setNodes((prev) => {
      const parentIndex = prev.findIndex((n) => n.id === nodeId);
      if (parentIndex === -1) return prev;
      const parent = prev[parentIndex];
      const newNodes = [...prev];
      const childX = parent.x + NODE_WIDTH + NODE_GAP_X;
      const parentCenterY = parent.y + NODE_HEIGHT / 2;
      const totalChildrenHeight = branchCount * NODE_HEIGHT + (branchCount - 1) * NODE_GAP_Y;
      const firstChildY = parentCenterY - totalChildrenHeight / 2;

      const created: Node[] = Array.from({ length: branchCount }).map((_, index) => {
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

      newNodes.push(...created);
      const newConnections: Connection[] = created.map((child, index) => ({
        id: `conn-${child.id}`,
        fromNodeId: nodeId,
        fromPortIndex: index,
        toNodeId: child.id,
        toPortIndex: 0,
      }));

      setConnections((prevConns) => {
        const existingIds = new Set(prevConns.map((c) => c.id));
        const uniqueNew = newConnections.filter((c) => !existingIds.has(c.id));
        return [...prevConns, ...uniqueNew];
      });

      return newNodes;
    });

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

      setNodes((prev) =>
        prev.map((node) => {
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
        })
      );

      if (deepLevel > 1) {
        await Promise.all(childIds.map(async (childId) => {
          await playNode({ nodeId: childId, apiKey, model: modelName });
        }));
      }
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'Ошибка выполнения';
       setNodes((prev) =>
        prev.map((node) => {
          if (childIds.includes(node.id)) {
            return { ...node, isPlaying: false, modelResponse: `⚠️ ${errorMessage}`, error: errorMessage };
          }
          return node;
        })
      );
    }
  };

  const deleteNode = (nodeId: string) => {
    const nodesToDelete = new Set<string>();
    const stack = [nodeId];
    while (stack.length > 0) {
      const currentId = stack.pop()!;
      nodesToDelete.add(currentId);
      const children = connections
        .filter(c => c.fromNodeId === currentId)
        .map(c => c.toNodeId);
      stack.push(...children);
    }
    setNodes(prev => prev.filter(n => !nodesToDelete.has(n.id)));
    setConnections(prev => prev.filter(c => 
      !nodesToDelete.has(c.fromNodeId) && !nodesToDelete.has(c.toNodeId)
    ));
  };

  const exportChat = () => {
    if (!currentChatId) return;
    const data = {
      version: 1,
      timestamp: Date.now(),
      chatId: currentChatId,
      nodes,
      connections,
      canvas, 
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tension-chat-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importChat = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!Array.isArray(data.nodes) || !Array.isArray(data.connections)) {
        throw new Error('Invalid format: nodes or connections array missing');
      }

      // Basic schema validation
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
      const importedNodes = data.nodes.map((n: any) => ({ ...n, chatId: newChatId }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const importedConnections = data.connections.map((c: any) => ({ ...c, chatId: newChatId }));

      await saveChat(newChat);
      await saveNodesByChat(newChatId, importedNodes);
      await saveConnectionsByChat(newChatId, importedConnections);

      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChatId);
      setNodes(importedNodes);
      setConnections(importedConnections);
      if (data.canvas) {
         setCanvas(data.canvas);
      } else {
         setCanvas(defaultCanvasState);
      }

    } catch (e) {
      console.error('Import failed', e);
      alert('Import failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const centerCanvas = () => {
    if (nodes.length === 0) {
      setCanvas((prev) => ({ ...prev, offsetX: 0, offsetY: 0, zoom: 1 }));
      return;
    }
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
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
  };

  const state: WorkspaceState = {
    canvas,
    settings: { model },
    nodes,
    connections,
    chats,
    currentChatId,
    isSaving,
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
      exportChat,
      importChat,
    },
  };
}
