import React from 'react';
import { CanvasState, defaultCanvasState } from '@/entities/canvas/model/types';
import { Settings } from '@/entities/settings/model/types';
import { Connection, Node } from '@/entities/node/model/types';
import { readSetting, saveSetting, readNodes, saveNodes, readConnections, saveConnections } from '@/shared/db/tensionDb';

export interface WorkspaceState {
  canvas: CanvasState;
  settings: Settings;
  nodes: Node[];
  connections: Connection[];
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
  };
}

export function useWorkspaceModel(): WorkspaceModel {
  const [canvas, setCanvas] = React.useState<CanvasState>(defaultCanvasState);
  const [model, setModel] = React.useState<string>('gpt-4.1');
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [connections, setConnections] = React.useState<Connection[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const [storedCanvas, storedModel, storedNodes, storedConnections] = await Promise.all([
          readSetting<CanvasState | undefined>('canvas_state'),
          readSetting<string | undefined>('settings_model'),
          readNodes<Node>(),
          readConnections<Connection>(),
        ]);

        if (cancelled) return;

        if (storedCanvas) {
          setCanvas(storedCanvas);
        }

        if (storedModel) {
          setModel(storedModel);
        }

        if (storedNodes && storedNodes.length > 0) {
          // Миграция: добавляем deepLevel для старых нод
          const migratedNodes = storedNodes.map((node) => ({
            ...node,
            deepLevel: node.deepLevel ?? 1,
            context: node.context ?? '',
          }));
          setNodes(migratedNodes as Node[]);
        } else {
          // Root-нода в центре видимой области (offset = 0,0)
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
        }

        if (storedConnections && storedConnections.length > 0) {
          setConnections(storedConnections);
        }
      } catch {
        if (cancelled) return;
        const rootFallback: Node = {
          id: 'root',
          x: 0,
          y: 0,
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
        setNodes([rootFallback]);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const state: WorkspaceState = {
    canvas,
    settings: {
      model,
    },
    nodes,
    connections,
  };

  const setTool = (tool: CanvasState['tool']) => {
    setCanvas((prev) => ({ ...prev, tool }));
  };

  const changeZoom = (delta: number) => {
    setCanvas((prev) => {
      const nextZoom = Math.min(2, Math.max(0.25, prev.zoom + delta));
      return { ...prev, zoom: nextZoom };
    });
  };

  // Zoom к позиции курсора
  const zoomAtPoint = (delta: number, clientX: number, clientY: number, canvasRect: DOMRect) => {
    const MAX_OFFSET = 5000;
    setCanvas((prev) => {
      const oldZoom = prev.zoom;
      const newZoom = Math.min(2, Math.max(0.25, oldZoom + delta));
      
      if (newZoom === oldZoom) return prev;

      // Позиция курсора относительно канваса
      const mouseX = clientX - canvasRect.left;
      const mouseY = clientY - canvasRect.top;

      // Позиция курсора в координатах контента (до zoom)
      const contentX = mouseX / oldZoom - prev.offsetX;
      const contentY = mouseY / oldZoom - prev.offsetY;

      // Новый offset, чтобы точка под курсором осталась на месте
      const newOffsetX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, mouseX / newZoom - contentX));
      const newOffsetY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, mouseY / newZoom - contentY));

      return {
        ...prev,
        zoom: newZoom,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      };
    });
  };

  const resetZoom = () => {
    setCanvas((prev) => ({ ...prev, zoom: defaultCanvasState.zoom }));
  };

  const centerCanvas = () => {
    setCanvas((prev) => ({ ...prev, offsetX: 0, offsetY: 0, zoom: 1 }));
  };

  const panCanvas = (dx: number, dy: number) => {
    // Ограничиваем pan чтобы канвас не улетал слишком далеко
    const MAX_OFFSET = 5000;
    setCanvas((prev) => ({
      ...prev,
      offsetX: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, prev.offsetX + dx)),
      offsetY: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, prev.offsetY + dy)),
    }));
  };

  const clearData = () => {
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

  const setSettingsModel = (next: string) => {
    setModel(next);
  };

  const updateNodePosition = (id: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === id ? { ...node, x, y } : node))
    );
  };

  const updateNodePrompt = (id: string, prompt: string) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === id ? { ...node, prompt } : node))
    );
  };

  const updateNodeBranchCount = (id: string, count: 1 | 2 | 3 | 4) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === id ? { ...node, branchCount: count } : node))
    );
  };

  const updateNodeDeepLevel = (id: string, level: 1 | 2 | 3 | 4) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === id ? { ...node, deepLevel: level } : node))
    );
  };

  const playNode = async ({ nodeId, apiKey, model: modelName }: { nodeId: string; apiKey: string; model: string }) => {
    const source = nodes.find((n) => n.id === nodeId);
    if (!source || !apiKey) return;

    const branchCount = source.branchCount;
    const deepLevel = source.deepLevel;
    const now = Date.now();

    const NODE_WIDTH = 340;
    const NODE_HEIGHT = 180;
    const GAP_X = 120;
    const GAP_Y = 80;

    // 1. Сразу создаём дочерние ноды со спиннером (isPlaying: true)
    const childIds: string[] = [];
    
    setNodes((prev) => {
      const parentIndex = prev.findIndex((n) => n.id === nodeId);
      if (parentIndex === -1) return prev;

      const parent = prev[parentIndex];
      const newNodes = [...prev];

      const childX = parent.x + NODE_WIDTH + GAP_X;
      const parentCenterY = parent.y + NODE_HEIGHT / 2;
      const totalChildrenHeight = branchCount * NODE_HEIGHT + (branchCount - 1) * GAP_Y;
      const firstChildY = parentCenterY - totalChildrenHeight / 2;

      const created: Node[] = Array.from({ length: branchCount }).map((_, index) => {
        const childId = `${nodeId}-child-${now}-${index}`;
        childIds.push(childId);
        const childY = firstChildY + index * (NODE_HEIGHT + GAP_Y);

        return {
          id: childId,
          x: childX,
          y: childY,
          context: source.prompt,
          modelResponse: null,
          prompt: '',
          branchCount: 1, // Для deep-продолжений по 1 ветке
          deepLevel: 1,
          isRoot: false,
          isPlaying: true,
          inputs: [],
          outputs: [],
        };
      });

      newNodes.push(...created);

      const newConnections: Connection[] = created.map((child, index) => ({
        id: `${nodeId}->${child.id}`,
        fromNodeId: nodeId,
        fromPortIndex: index,
        toNodeId: child.id,
        toPortIndex: 0,
      }));

      setConnections((prev) => [...prev, ...newConnections]);

      return newNodes;
    });

    // 2. Делаем запрос к API
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
          messages: [
            {
              role: 'user',
              content: source.prompt,
            },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI error: ${response.status}`);
      }

      const data = await response.json();
      const choices = (data.choices ?? []).slice(0, branchCount);

      // 3. Заполняем ответы в дочерних нодах
      setNodes((prev) =>
        prev.map((node) => {
          const childIndex = childIds.indexOf(node.id);
          if (childIndex === -1) return node;

          const choice = choices[childIndex];
          const content = choice?.message?.content ?? '';

          return {
            ...node,
            modelResponse: typeof content === 'string' ? content : String(content),
            // Если deep > 1, оставляем isPlaying: true для продолжения
            isPlaying: deepLevel > 1,
            // Устанавливаем prompt для автоматического продолжения
            prompt: deepLevel > 1 ? `Продолжи и углуби этот ответ: ${content.slice(0, 200)}...` : '',
          };
        })
      );

      // 4. Если deep > 1, рекурсивно запускаем playNode на дочерних нодах
      if (deepLevel > 1) {
        // Небольшая задержка для визуального эффекта
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // Запускаем параллельно для всех дочерних нод
        await Promise.all(
          childIds.map(async (childId) => {
            // Обновляем deepLevel дочерней ноды перед запуском
            setNodes((prev) =>
              prev.map((node) =>
                node.id === childId
                  ? { ...node, deepLevel: Math.max(1, deepLevel - 1) as 1 | 2 | 3 | 4, branchCount: 1 }
                  : node
              )
            );
            // Рекурсивный вызов
            await playNode({ nodeId: childId, apiKey, model: modelName });
          })
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка выполнения';
      setNodes((prev) =>
        prev.map((node) => {
          if (childIds.includes(node.id)) {
            return {
              ...node,
              isPlaying: false,
              modelResponse: `⚠️ ${errorMessage}`,
              error: errorMessage,
            };
          }
          return node;
        })
      );
    }
  };

  React.useEffect(() => {
    void saveSetting('canvas_state', canvas);
  }, [canvas]);

  React.useEffect(() => {
    void saveSetting('settings_model', model);
  }, [model]);

  React.useEffect(() => {
    void saveNodes(nodes);
  }, [nodes]);

  React.useEffect(() => {
    void saveConnections(connections);
  }, [connections]);

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
    },
  };
}
