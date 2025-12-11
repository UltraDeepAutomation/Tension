import React, { useRef, useEffect } from 'react';
import type { Node } from '@/entities/node/model/types';
import type { CanvasState } from '@/entities/canvas/model/types';
import { NODE_WIDTH, NODE_HEIGHT } from '@/shared/config/constants';

interface MinimapProps {
  nodes: Node[];
  canvasState: CanvasState;
  onNavigate: (x: number, y: number) => void;
}

export const Minimap: React.FC<MinimapProps> = ({ nodes, canvasState, onNavigate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Constants for minimap rendering
  const MINIMAP_WIDTH = 240;
  const MINIMAP_HEIGHT = 160;
  const PADDING = 40;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Calculate bounding box of all nodes
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + NODE_WIDTH;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys) + NODE_HEIGHT;

    const worldWidth = maxX - minX + PADDING * 2;
    const worldHeight = maxY - minY + PADDING * 2;

    // 2. Calculate scale to fit world into minimap
    const scaleX = MINIMAP_WIDTH / worldWidth;
    const scaleY = MINIMAP_HEIGHT / worldHeight;
    const scale = Math.min(scaleX, scaleY);

    // 3. Clear canvas
    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // 4. Draw nodes
    ctx.fillStyle = 'rgba(200, 200, 210, 0.8)'; // Node color
    nodes.forEach((node) => {
      // Map node coordinates to minimap coordinates
      // Offset by minX/minY to normalize to 0,0, then add PADDING, then scale
      const mx = (node.x - minX + PADDING) * scale;
      const my = (node.y - minY + PADDING) * scale;
      const mw = NODE_WIDTH * scale;
      const mh = NODE_HEIGHT * scale;

      ctx.beginPath();
      ctx.roundRect(mx, my, mw, mh, 2);
      ctx.fill();
      
      // Highlight root or active?
      if (node.isRoot) {
         ctx.fillStyle = 'rgba(99, 102, 241, 0.8)';
         ctx.fill();
         ctx.fillStyle = 'rgba(200, 200, 210, 0.8)'; // Reset
      }
    });

    // 5. Draw Viewport Rect
    // Viewport in world coords:
    // visibleX = -offsetX / zoom
    // visibleY = -offsetY / zoom
    // visibleW = window.innerWidth / zoom
    // visibleH = window.innerHeight / zoom
    
    // BUT: offsetX in canvasState is the translation applied to the container.
    // transform: translate(offsetX, offsetY)
    // So top-left of content visible at 0,0 screen is when world point p satisfies: p * zoom + offset = 0 => p = -offset/zoom
    
    const viewportWidth = window.innerWidth; // Approximate, ideally passed as prop
    const viewportHeight = window.innerHeight;

    const vx = (-canvasState.offsetX) / canvasState.zoom;
    const vy = (-canvasState.offsetY) / canvasState.zoom;
    const vw = viewportWidth / canvasState.zoom;
    const vh = viewportHeight / canvasState.zoom;

    const vmx = (vx - minX + PADDING) * scale;
    const vmy = (vy - minY + PADDING) * scale;
    const vmw = vw * scale;
    const vmh = vh * scale;

    ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(vmx, vmy, vmw, vmh);

  }, [nodes, canvasState]);

  const handleClick = (e: React.MouseEvent) => {
    if (nodes.length === 0) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Reverse calc:
    // clickX = (worldX - minX + PADDING) * scale
    // worldX = clickX / scale - PADDING + minX
    
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + NODE_WIDTH;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys) + NODE_HEIGHT;
    const worldWidth = maxX - minX + PADDING * 2;
    const worldHeight = maxY - minY + PADDING * 2;
    const scaleX = MINIMAP_WIDTH / worldWidth;
    const scaleY = MINIMAP_HEIGHT / worldHeight;
    const scale = Math.min(scaleX, scaleY);

    const worldX = clickX / scale - PADDING + minX;
    const worldY = clickY / scale - PADDING + minY;

    // We want to center the viewport on this worldX, worldY
    // offsetX = (viewportW / 2) / zoom - worldX
    
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    
    // Canvas.tsx transform: `scale(${zoom}) translate(${offsetX}px, ${offsetY}px)`
    // Screen Pos = (worldX + offsetX) * zoom
    // We want Screen Pos = ScreenW / 2
    // worldX + offsetX = (ScreenW / 2) / zoom
    // offsetX = (ScreenW / 2) / zoom - worldX
    
    const newOffsetX = (viewportW / 2) / canvasState.zoom - worldX;
    const newOffsetY = (viewportH / 2) / canvasState.zoom - worldY;

    // Calculate delta for panCanvas
    const dx = newOffsetX - canvasState.offsetX;
    const dy = newOffsetY - canvasState.offsetY;
    onNavigate(dx, dy);
  };

  return (
    <div className="minimap" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        onClick={handleClick}
        className="minimap-canvas"
      />
    </div>
  );
};
