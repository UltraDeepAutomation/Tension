import React from 'react';
import { CanvasState, defaultCanvasState } from '@/entities/canvas/model/types';
import { Settings } from '@/entities/settings/model/types';
import { Node } from '@/entities/node/model/types';
import { readSetting, saveSetting, readNodes, saveNodes } from '@/shared/db/tensionDb';

export interface WorkspaceState {
  canvas: CanvasState;
  settings: Settings;
  nodes: Node[];
}

export interface WorkspaceModel {
  state: WorkspaceState;
  actions: {
    setTool: (tool: CanvasState['tool']) => void;
    changeZoom: (delta: number) => void;
    resetZoom: () => void;
    setSettingsModel: (model: string) => void;
    updateNodePosition: (id: string, x: number, y: number) => void;
  };
}

export function useWorkspaceModel(): WorkspaceModel {
  const [canvas, setCanvas] = React.useState<CanvasState>(defaultCanvasState);
  const [model, setModel] = React.useState<string>('gpt-4.1');
  const [nodes, setNodes] = React.useState<Node[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const [storedCanvas, storedModel, storedNodes] = await Promise.all([
          readSetting<CanvasState | undefined>('canvas_state'),
          readSetting<string | undefined>('settings_model'),
          readNodes<Node>(),
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

  React.useEffect(() => {
    void saveSetting('canvas_state', canvas);
  }, [canvas]);

  React.useEffect(() => {
    void saveSetting('settings_model', model);
  }, [model]);

  React.useEffect(() => {
    void saveNodes(nodes);
  }, [nodes]);

  return {
    state,
    actions: {
      setTool,
      changeZoom,
      resetZoom,
      setSettingsModel,
      updateNodePosition,
    },
  };
}
