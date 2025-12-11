import React, { useRef, useEffect, useState } from 'react';
import type { Node } from '@/entities/node/model/types';
import type { CanvasState } from '@/entities/canvas/model/types';
import { NODE_WIDTH, NODE_HEIGHT } from '@/shared/config/constants';

interface MinimapProps {
  nodes: Node[];
  canvasState: CanvasState;
  onNavigate: (x: number, y: number) => void;
}

// Get CSS custom property value
const getCSSVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};

export const Minimap: React.FC<MinimapProps> = ({ nodes, canvasState, onNavigate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 180, height: 110 });

  // Update dimensions from CSS on mount and theme change
  useEffect(() => {
    const updateDimensions = () => {
      const width = parseInt(getCSSVar('--minimap-width', '180'), 10);
      const height = parseInt(getCSSVar('--minimap-height', '110'), 10);
      setDimensions({ width, height });
    };
    updateDimensions();
    
    // Listen for theme changes
    const observer = new MutationObserver(updateDimensions);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const MINIMAP_WIDTH = dimensions.width;
  const MINIMAP_HEIGHT = dimensions.height;
  const PADDING = 20;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get theme colors from CSS
    const nodeColor = getCSSVar('--minimap-node', '#d1d5db');
    const rootColor = getCSSVar('--minimap-node-root', '#9ca3af');
    const viewportStroke = getCSSVar('--minimap-viewport-stroke', '#6366f1');
    const viewportFill = getCSSVar('--minimap-viewport', 'rgba(99, 102, 241, 0.2)');

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
    const scale = Math.min(scaleX, scaleY, 0.15); // Cap scale to avoid too large nodes

    // Center the content
    const scaledWidth = worldWidth * scale;
    const scaledHeight = worldHeight * scale;
    const offsetX = (MINIMAP_WIDTH - scaledWidth) / 2;
    const offsetY = (MINIMAP_HEIGHT - scaledHeight) / 2;

    // 3. Clear canvas
    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // 4. Draw nodes with proper proportions
    nodes.forEach((node) => {
      const mx = offsetX + (node.x - minX + PADDING) * scale;
      const my = offsetY + (node.y - minY + PADDING) * scale;
      const mw = NODE_WIDTH * scale;
      const mh = NODE_HEIGHT * scale;

      ctx.fillStyle = node.isRoot ? rootColor : nodeColor;
      ctx.beginPath();
      ctx.roundRect(mx, my, mw, mh, Math.max(1, 3 * scale));
      ctx.fill();
    });

    // 5. Draw Viewport Rect
    const viewportWidth = window.innerWidth - 300; // Approximate canvas width
    const viewportHeight = window.innerHeight - 32;

    const vx = (-canvasState.offsetX);
    const vy = (-canvasState.offsetY);
    const vw = viewportWidth / canvasState.zoom;
    const vh = viewportHeight / canvasState.zoom;

    const vmx = offsetX + (vx - minX + PADDING) * scale;
    const vmy = offsetY + (vy - minY + PADDING) * scale;
    const vmw = vw * scale;
    const vmh = vh * scale;

    // Fill viewport area
    ctx.fillStyle = viewportFill;
    ctx.fillRect(vmx, vmy, vmw, vmh);
    
    // Stroke viewport border
    ctx.strokeStyle = viewportStroke;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vmx, vmy, vmw, vmh);

  }, [nodes, canvasState, MINIMAP_WIDTH, MINIMAP_HEIGHT]);

  const handleClick = (e: React.MouseEvent) => {
    if (nodes.length === 0) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Calculate same values as in render
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
    const scale = Math.min(scaleX, scaleY, 0.15);

    // Center offset
    const scaledWidth = worldWidth * scale;
    const scaledHeight = worldHeight * scale;
    const offsetXMinimap = (MINIMAP_WIDTH - scaledWidth) / 2;
    const offsetYMinimap = (MINIMAP_HEIGHT - scaledHeight) / 2;

    // Reverse: clickX = offsetXMinimap + (worldX - minX + PADDING) * scale
    const worldX = (clickX - offsetXMinimap) / scale - PADDING + minX;
    const worldY = (clickY - offsetYMinimap) / scale - PADDING + minY;

    // Center viewport on clicked world position
    const viewportW = window.innerWidth - 300;
    const viewportH = window.innerHeight - 32;
    
    const newOffsetX = -worldX + (viewportW / 2) / canvasState.zoom;
    const newOffsetY = -worldY + (viewportH / 2) / canvasState.zoom;

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
