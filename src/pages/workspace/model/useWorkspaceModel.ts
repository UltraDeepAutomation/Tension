import React from 'react';
import { CanvasState, defaultCanvasState } from '@/entities/canvas/model/types';
import { Settings } from '@/entities/settings/model/types';
import { useOpenAIKey } from '@/features/manage-openai-key/model/useOpenAIKey';

export interface WorkspaceState {
  canvas: CanvasState;
  settings: Settings;
}

export interface WorkspaceModel {
  state: WorkspaceState;
  actions: {
    setTool: (tool: CanvasState['tool']) => void;
    changeZoom: (delta: number) => void;
    resetZoom: () => void;
    setSettingsModel: (model: string) => void;
  };
}

export function useWorkspaceModel(): WorkspaceModel {
  const { apiKey } = useOpenAIKey();
  const [canvas, setCanvas] = React.useState<CanvasState>(defaultCanvasState);
  const [model, setModel] = React.useState<string>('gpt-4.1');

  const state: WorkspaceState = {
    canvas,
    settings: {
      openAIApiKey: apiKey,
      model,
    },
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

  return {
    state,
    actions: {
      setTool,
      changeZoom,
      resetZoom,
      setSettingsModel,
    },
  };
}
