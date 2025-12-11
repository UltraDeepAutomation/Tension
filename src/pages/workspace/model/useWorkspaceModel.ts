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
    resetZoom: () => void;
    setSettingsModel: (model: string) => void;
    updateNodePosition: (id: string, x: number, y: number) => void;
    playNode: (params: { nodeId: string; apiKey: string; model: string }) => Promise<void>;
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

  const resetZoom = () => {
    setCanvas((prev) => ({ ...prev, zoom: defaultCanvasState.zoom }));
  };

  const setSettingsModel = (next: string) => {
    setModel(next);
  };

  const updateNodePosition = (id: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === id ? { ...node, x, y } : node))
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

        const baseX = parent.x + 360;
        const baseY = parent.y - ((branchCount - 1) * 80) / 2;

        const created: Node[] = choices.map((choice: any, index: number) => {
          const childId = `${nodeId}-child-${now}-${index}`;
          const content = choice.message?.content ?? '';

          const child: Node = {
            id: childId,
            x: baseX,
            y: baseY + index * 80,
            prompt: source.prompt,
            modelResponse: typeof content === 'string' ? content : String(content),
            branchCount: parent.branchCount,
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
      resetZoom,
      setSettingsModel,
      updateNodePosition,
      playNode,
    },
  };
}
