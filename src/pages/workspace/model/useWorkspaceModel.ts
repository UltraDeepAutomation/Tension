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
    panCanvas: (dx: number, dy: number) => void;
    setSettingsModel: (model: string) => void;
    updateNodePosition: (id: string, x: number, y: number) => void;
    updateNodePrompt: (id: string, prompt: string) => void;
    updateNodeBranchCount: (id: string, count: 1 | 2 | 3 | 4) => void;
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
          setNodes(storedNodes);
        } else {
          // Root-нода в центре видимой области (offset = 0,0)
          const root: Node = {
            id: 'root',
            x: 100,
            y: 100,
            prompt: 'С чем сейчас поработаем?',
            modelResponse: null,
            branchCount: 4,
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
          prompt: 'С чем сейчас поработаем?',
          modelResponse: null,
          branchCount: 4,
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
      const newOffsetX = mouseX / newZoom - contentX;
      const newOffsetY = mouseY / newZoom - contentY;

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

  const panCanvas = (dx: number, dy: number) => {
    setCanvas((prev) => ({
      ...prev,
      offsetX: prev.offsetX + dx,
      offsetY: prev.offsetY + dy,
    }));
  };

  const clearData = () => {
    const root: Node = {
      id: 'root',
      x: 0,
      y: 0,
      prompt: 'С чем сейчас поработаем?',
      modelResponse: null,
      branchCount: 4,
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

  const playNode = async ({ nodeId, apiKey, model: modelName }: { nodeId: string; apiKey: string; model: string }) => {
    const source = nodes.find((n) => n.id === nodeId);
    if (!source || !apiKey) return;

    const branchCount = source.branchCount;

    // помечаем ноду как выполняющуюся
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId ? { ...node, isPlaying: true, error: undefined } : node
      )
    );

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

      setNodes((prev) => {
        const now = Date.now();
        const parentIndex = prev.findIndex((n) => n.id === nodeId);
        if (parentIndex === -1) return prev;

        const parent = prev[parentIndex];
        const newNodes = [...prev];

        const NODE_WIDTH = 320;
        const NODE_HEIGHT = 220;
        const GAP_X = 100; // Горизонтальный отступ между родителем и детьми
        const GAP_Y = 60;  // Вертикальный отступ между детьми

        // Позиция X для всех дочерних нод (справа от родителя)
        const childX = parent.x + NODE_WIDTH + GAP_X;

        // Центрируем детей относительно центра родителя
        const parentCenterY = parent.y + NODE_HEIGHT / 2;
        const totalChildrenHeight = branchCount * NODE_HEIGHT + (branchCount - 1) * GAP_Y;
        const firstChildY = parentCenterY - totalChildrenHeight / 2;

        const created: Node[] = choices.map((choice: any, index: number) => {
          const childId = `${nodeId}-child-${now}-${index}`;
          const content = choice.message?.content ?? '';

          // Каждая нода смещается на (NODE_HEIGHT + GAP_Y) * index
          const childY = firstChildY + index * (NODE_HEIGHT + GAP_Y);

          const child: Node = {
            id: childId,
            x: childX,
            y: childY,
            prompt: source.prompt,
            modelResponse: typeof content === 'string' ? content : String(content),
            branchCount: 2, // Дочерние ноды по умолчанию имеют 2 ветки
            isRoot: false,
            isPlaying: false,
            inputs: [],
            outputs: [],
          };

          return child;
        });

        newNodes.push(...created);

        // обновляем родителя
        newNodes[parentIndex] = {
          ...parent,
          isPlaying: false,
          modelResponse: null,
        };

        // создаём connections
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
    } catch (error) {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? { ...node, isPlaying: false, error: error instanceof Error ? error.message : 'Ошибка выполнения Play' }
            : node
        )
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
      panCanvas,
      setSettingsModel,
      updateNodePosition,
      updateNodePrompt,
      updateNodeBranchCount,
      playNode,
      clearData,
    },
  };
}
