import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Node } from '@/entities/node/model/types';
import type { CanvasState } from '@/entities/canvas/model/types';
import { NODE_WIDTH } from '@/shared/config/constants';

interface MinimapProps {
  nodes: Node[];
  canvasState: CanvasState;
  onNavigate: (x: number, y: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

// Get CSS custom property value
const getCSSVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};

// Estimated node height for minimap (collapsed state)
const MINIMAP_NODE_HEIGHT = 120;

/**
 * Minimap — shows a scaled-down view of the entire canvas with viewport indicator
 */
export const Minimap: React.FC<MinimapProps> = ({ 
  nodes, 
  canvasState, 
  onNavigate,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 180, height: 120 });

  // Update dimensions from CSS on mount and theme change
  useEffect(() => {
    const updateDimensions = () => {
      const width = parseInt(getCSSVar('--minimap-width', '180'), 10);
      const height = parseInt(getCSSVar('--minimap-height', '120'), 10);
      setDimensions({ width, height });
    };
    updateDimensions();
    
    const observer = new MutationObserver(updateDimensions);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const MINIMAP_WIDTH = dimensions.width;
  const MINIMAP_HEIGHT = dimensions.height;

  // Calculate the minimap scale based on all nodes + viewport
  const getMinimapTransform = useCallback(() => {
    // Get viewport dimensions in world space
    const viewportW = (window.innerWidth - 300) / canvasState.zoom;
    const viewportH = (window.innerHeight - 100) / canvasState.zoom;
    const viewportX = -canvasState.offsetX;
    const viewportY = -canvasState.offsetY;

    // Calculate bounding box including all nodes AND viewport
    let minX = viewportX;
    let maxX = viewportX + viewportW;
    let minY = viewportY;
    let maxY = viewportY + viewportH;

    nodes.forEach((node) => {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x + NODE_WIDTH);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y + MINIMAP_NODE_HEIGHT);
    });

    // Add padding around content
    const padding = 80;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;

    // Calculate scale to fit all content in minimap
    const scaleX = MINIMAP_WIDTH / contentWidth;
    const scaleY = MINIMAP_HEIGHT / contentHeight;
    const scale = Math.min(scaleX, scaleY, 0.15); // Max scale limit

    // Center the content
    const scaledWidth = contentWidth * scale;
    const scaledHeight = contentHeight * scale;
    const offsetX = (MINIMAP_WIDTH - scaledWidth) / 2 - (minX - padding) * scale;
    const offsetY = (MINIMAP_HEIGHT - scaledHeight) / 2 - (minY - padding) * scale;

    return { scale, offsetX, offsetY, viewportX, viewportY, viewportW, viewportH };
  }, [nodes, canvasState, MINIMAP_WIDTH, MINIMAP_HEIGHT]);

  // Draw minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get theme colors
    const nodeColor = getCSSVar('--minimap-node', '#d1d5db');
    const rootColor = getCSSVar('--minimap-node-root', '#9ca3af');
    const viewportColor = getCSSVar('--color-primary', '#6366f1');

    // Clear canvas
    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    const { scale, offsetX, offsetY, viewportX, viewportY, viewportW, viewportH } = getMinimapTransform();

    // Draw each node
    nodes.forEach((node) => {
      const x = node.x * scale + offsetX;
      const y = node.y * scale + offsetY;
      const w = NODE_WIDTH * scale;
      const h = MINIMAP_NODE_HEIGHT * scale;

      ctx.fillStyle = node.isRoot ? rootColor : nodeColor;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, Math.max(1, 2 * scale));
      ctx.fill();
    });

    // Draw viewport rectangle
    const vx = viewportX * scale + offsetX;
    const vy = viewportY * scale + offsetY;
    const vw = viewportW * scale;
    const vh = viewportH * scale;

    ctx.strokeStyle = viewportColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.roundRect(vx, vy, vw, vh, 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Fill viewport with semi-transparent color
    ctx.fillStyle = `${viewportColor}15`;
    ctx.beginPath();
    ctx.roundRect(vx, vy, vw, vh, 2);
    ctx.fill();

  }, [nodes, canvasState, MINIMAP_WIDTH, MINIMAP_HEIGHT, getMinimapTransform]);

  // Handle click to navigate
  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { scale, offsetX, offsetY, viewportW, viewportH } = getMinimapTransform();

    // Convert minimap coordinates to world coordinates
    const worldX = (clickX - offsetX) / scale;
    const worldY = (clickY - offsetY) / scale;

    // Calculate new offset to center viewport on clicked point
    const newOffsetX = -(worldX - viewportW / 2);
    const newOffsetY = -(worldY - viewportH / 2);

    const dx = newOffsetX - canvasState.offsetX;
    const dy = newOffsetY - canvasState.offsetY;
    onNavigate(dx, dy);
  }, [canvasState, onNavigate, getMinimapTransform]);

  const zoomPercent = Math.round(canvasState.zoom * 100);

  return (
    <div className="minimap" ref={containerRef}>
      {/* Zoom Controls */}
      <div className="minimap-controls">
        <button 
          className="minimap-zoom-btn" 
          onClick={onZoomOut}
          title="Уменьшить"
        >
          −
        </button>
        <button 
          className="minimap-zoom-label" 
          onClick={onResetZoom}
          title="Сбросить масштаб"
        >
          {zoomPercent}%
        </button>
        <button 
          className="minimap-zoom-btn" 
          onClick={onZoomIn}
          title="Увеличить"
        >
          +
        </button>
      </div>
      
      {/* Canvas Preview */}
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
