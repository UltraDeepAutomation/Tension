export type ToolMode = 'cursor' | 'hand';

export interface CanvasState {
  tool: ToolMode;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export const INITIAL_ZOOM = 0.75;

export const defaultCanvasState: CanvasState = {
  tool: 'cursor',
  zoom: INITIAL_ZOOM,
  offsetX: 0,
  offsetY: 0,
};
