import React from 'react';
import type { CanvasState } from '@/entities/canvas/model/types';
import type { Node, Connection } from '@/entities/node/model/types';
import { NodeCard } from './NodeCard';
import { ContextMenu, ContextMenuItem } from '@/widgets/context-menu/ui/ContextMenu';
import { NODE_WIDTH, NODE_HEIGHT, PORT_SIZE, PORT_GAP, PORTS_TOP, PORT_Y_OFFSET, PROVIDER_COLORS } from '@/shared/config/constants';

interface CanvasProps {
  canvasState: CanvasState;
  nodes: Node[];
  connections: Connection[];
  onNodePositionChange: (id: string, x: number, y: number, isTransient?: boolean) => void;
  onNodePromptChange: (id: string, prompt: string) => void;
  onNodeBranchCountChange: (id: string, count: 1 | 2 | 3 | 4) => void;
  onNodeDeepLevelChange: (id: string, level: 1 | 2 | 3 | 4) => void;
  onNodeModelChange: (id: string, modelId: string, providerId: import('@/entities/node/model/types').ProviderId) => void;
  onCanvasPan: (dx: number, dy: number) => void;
  onZoomAtPoint: (delta: number, clientX: number, clientY: number, canvasRect: DOMRect) => void;
  isZoomModifierActive: boolean;
  onPlayNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onCopyNodes: (nodeIds: string[]) => void;
  onPasteNodes: () => void;
  onCenterCanvas: () => void;
  onResetZoom: () => void;
  // Council mode
  councilMode?: boolean;
  councilName?: string;
  onPlayCouncil?: (nodeId: string) => void;
  onPlayMultiModel?: (nodeId: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  canvasState,
  nodes,
  connections,
  onNodePositionChange,
  onNodePromptChange,
  onNodeBranchCountChange,
  onNodeDeepLevelChange,
  onNodeModelChange,
  onCanvasPan,
  onZoomAtPoint,
  isZoomModifierActive,
  onPlayNode,
  onDeleteNode,
  onDuplicateNode,
  onCopyNodes,
  onPasteNodes,
  onCenterCanvas,
  onResetZoom,
  councilMode = false,
  councilName,
  onPlayCouncil,
  onPlayMultiModel,
}) => {
  const canvasRef = React.useRef<HTMLDivElement>(null);

  // Драг ноды
  const [draggingNodeId, setDraggingNodeId] = React.useState<string | null>(null);
  // Точка старта курсора при начале драга
  const nodeDragLastPos = React.useRef<{ x: number; y: number } | null>(null);
  // Позиции всех перетаскиваемых нод на момент начала драга
  const dragStartPositionsRef = React.useRef<Map<string, { x: number; y: number }> | null>(null);

  // Драг канваса (pan)
  const [isPanning, setIsPanning] = React.useState(false);
  const panLastPos = React.useRef<{ x: number; y: number } | null>(null);

  // Multi-select: Set of selected node IDs
  const [selectedNodeIds, setSelectedNodeIds] = React.useState<Set<string>>(new Set());

  // Context Menu
  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
    type: 'canvas' | 'node';
    targetId?: string;
  } | null>(null);

  // Selection helpers
  const selectNode = React.useCallback((nodeId: string, addToSelection: boolean) => {
    setSelectedNodeIds(prev => {
      if (addToSelection) {
        // Toggle selection for Shift+Click
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return next;
      } else {
        // Single selection
        return new Set([nodeId]);
      }
    });
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectedNodeIds(new Set());
  }, []);

  const selectAll = React.useCallback(() => {
    setSelectedNodeIds(new Set(nodes.map(n => n.id)));
  }, [nodes]);

  // Keyboard handler for Delete, Escape, Select All
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Не обрабатывать если фокус в input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Delete/Backspace — удалить выделенные ноды
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.size > 0) {
          e.preventDefault();
          // Delete all selected nodes
          selectedNodeIds.forEach(nodeId => {
            onDeleteNode(nodeId);
          });
          clearSelection();
        }
      }
      
      // Escape — снять выделение
      if (e.key === 'Escape') {
        clearSelection();
      }

      // Cmd/Ctrl+A — выделить все
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
      }

      // Cmd/Ctrl+C — копировать выделенные ноды
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        if (selectedNodeIds.size > 0) {
          e.preventDefault();
          onCopyNodes(Array.from(selectedNodeIds));
        }
      }

      // Cmd/Ctrl+V — вставить ноды
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        onPasteNodes();
      }

      // Tab — navigate between nodes
      if (e.key === 'Tab') {
        e.preventDefault();
        if (nodes.length === 0) return;
        
        const currentIds = Array.from(selectedNodeIds);
        const lastSelectedId = currentIds[currentIds.length - 1];
        const currentIndex = lastSelectedId 
          ? nodes.findIndex(n => n.id === lastSelectedId)
          : -1;
        
        let nextIndex: number;
        if (e.shiftKey) {
          // Shift+Tab — previous node
          nextIndex = currentIndex <= 0 ? nodes.length - 1 : currentIndex - 1;
        } else {
          // Tab — next node
          nextIndex = currentIndex >= nodes.length - 1 ? 0 : currentIndex + 1;
        }
        
        const nextNode = nodes[nextIndex];
        if (nextNode) {
          selectNode(nextNode.id, false);
        }
      }

      // Arrow keys — move selected nodes
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedNodeIds.size > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 50 : 10; // Shift for larger steps
          let dx = 0, dy = 0;
          
          switch (e.key) {
            case 'ArrowUp': dy = -step; break;
            case 'ArrowDown': dy = step; break;
            case 'ArrowLeft': dx = -step; break;
            case 'ArrowRight': dx = step; break;
          }
          
          selectedNodeIds.forEach(nodeId => {
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
              onNodePositionChange(nodeId, node.x + dx, node.y + dy, false);
            }
          });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, onDeleteNode, clearSelection, selectAll, nodes, selectNode, onNodePositionChange, onCopyNodes, onPasteNodes]);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    const nodeEl = (event.target as HTMLElement).closest('.node');
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id');
      if (nodeId) {
        setContextMenu({ x: event.clientX, y: event.clientY, type: 'node', targetId: nodeId });
        return;
      }
    }
    setContextMenu({ x: event.clientX, y: event.clientY, type: 'canvas' });
  };

  const contextMenuItems: ContextMenuItem[] = React.useMemo(() => {
    if (!contextMenu) return [];
    if (contextMenu.type === 'node' && contextMenu.targetId) {
      const id = contextMenu.targetId;
      return [
        {
          label: 'Дублировать',
          icon: '⎘', 
          onClick: () => onDuplicateNode(id),
        },
        {
          label: 'Удалить',
          icon: '×',
          onClick: () => onDeleteNode(id),
          danger: true,
        },
        { label: 'Generate Response', icon: '▶', onClick: () => onPlayNode(id) },
      ];
    }
    return [
      { label: 'Fit View', icon: '⤢', onClick: onCenterCanvas },
      { label: 'Reset Zoom', icon: '0', onClick: onResetZoom },
    ];
  }, [contextMenu, onPlayNode, onDeleteNode, onCenterCanvas, onResetZoom]);

  // --- Handlers (Memoized) ---

  const handleNodeHeaderMouseDown = React.useCallback((
    event: React.MouseEvent<HTMLDivElement>,
    node: Node
  ) => {
    event.preventDefault();
    event.stopPropagation();

    // Запоминаем стартовую позицию курсора (в экранных координатах)
    nodeDragLastPos.current = { x: event.clientX, y: event.clientY };

    // Определяем, какие ноды двигаем: либо вся текущая мульти-выделенная группа,
    // либо только эту ноду, если она не была выделена
    const affectedIds = selectedNodeIds.has(node.id)
      ? Array.from(selectedNodeIds)
      : [node.id];

    const startPositions = new Map<string, { x: number; y: number }>();
    affectedIds.forEach((id) => {
      const found = nodes.find((n) => n.id === id);
      if (found) {
        startPositions.set(id, { x: found.x, y: found.y });
      }
    });
    dragStartPositionsRef.current = startPositions;

    setDraggingNodeId(node.id);
    
    // If dragging a non-selected node, select only it
    // If dragging a selected node, keep the selection for group drag
    if (!selectedNodeIds.has(node.id)) {
      setSelectedNodeIds(new Set([node.id]));
    }
  }, [nodes, selectedNodeIds]);

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const isCanvas = target === event.currentTarget || 
                     target.classList.contains('canvas-inner') ||
                     target.classList.contains('canvas-view') ||
                     target.tagName === 'svg';

    if (isCanvas) {
      // Снять выделение при клике на пустое место
      clearSelection();
      
      // In hand mode OR when clicking empty canvas, allow panning
      // In cursor mode, only pan if clicking on empty canvas (not nodes)
      if (canvasState.tool === 'hand' || isCanvas) {
        event.preventDefault();
        panLastPos.current = { x: event.clientX, y: event.clientY };
        setIsPanning(true);
      }
    }
  };

  // Memoized action wrappers for NodeCard to prevent re-renders
  const handlePromptChange = React.useCallback((id: string, prompt: string) => {
    onNodePromptChange(id, prompt);
  }, [onNodePromptChange]);

  const handleBranchCountChange = React.useCallback((id: string, count: 1 | 2 | 3 | 4) => {
    onNodeBranchCountChange(id, count);
  }, [onNodeBranchCountChange]);

  const handleDeepLevelChange = React.useCallback((id: string, level: 1 | 2 | 3 | 4) => {
    onNodeDeepLevelChange(id, level);
  }, [onNodeDeepLevelChange]);

  const handlePlay = React.useCallback((id: string) => {
    onPlayNode(id);
  }, [onPlayNode]);

  const handleDelete = React.useCallback((id: string) => {
    onDeleteNode(id);
  }, [onDeleteNode]);

  // --- Optimized Node Lookup (moved before effects that use it) ---
  const nodeMap = React.useMemo(() => 
    new Map(nodes.map(n => [n.id, n])), 
    [nodes]
  );

  // Глобальные слушатели
  React.useEffect(() => {
    if (!draggingNodeId && !isPanning) return;

    const handleWindowMouseMove = (event: MouseEvent) => {
      // 1. Drag Node(s) - supports multi-select group drag
      if (draggingNodeId && nodeDragLastPos.current && dragStartPositionsRef.current) {
        event.preventDefault();

        // Считаем смещение относительно точки начала драга в мировых координатах
        const { x: startMouseX, y: startMouseY } = nodeDragLastPos.current;
        const dx = (event.clientX - startMouseX) / canvasState.zoom;
        const dy = (event.clientY - startMouseY) / canvasState.zoom;

        // Двигаем все ноды относительно сохранённых стартовых позиций
        dragStartPositionsRef.current.forEach((startPos, nodeId) => {
          onNodePositionChange(nodeId, startPos.x + dx, startPos.y + dy, true);
        });
      }

      // 2. Pan Canvas
      if (isPanning && panLastPos.current) {
        event.preventDefault();
        const { x: lastX, y: lastY } = panLastPos.current;
        const dx = (event.clientX - lastX) / canvasState.zoom;
        const dy = (event.clientY - lastY) / canvasState.zoom;

        panLastPos.current = { x: event.clientX, y: event.clientY };
        onCanvasPan(dx, dy);
      }
    };

    const handleWindowMouseUp = () => {
      if (draggingNodeId) {
        // Commit the final position to history (берём актуальные координаты из nodeMap)
        const node = nodeMap.get(draggingNodeId);
        if (node) {
          onNodePositionChange(draggingNodeId, node.x, node.y, false);
        }
      }
      setDraggingNodeId(null);
      nodeDragLastPos.current = null;
      dragStartPositionsRef.current = null;
      setIsPanning(false);
      panLastPos.current = null;
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggingNodeId, isPanning, canvasState.zoom, nodeMap, onNodePositionChange, onCanvasPan, selectedNodeIds]);


  // Wheel handling
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.metaKey || event.ctrlKey || isZoomModifierActive) {
        const delta = -event.deltaY * 0.001;
        if (delta !== 0) {
          const rect = canvas.getBoundingClientRect();
          onZoomAtPoint(delta, event.clientX, event.clientY, rect);
        }
      } else {
        const dx = -event.deltaX / canvasState.zoom;
        const dy = -event.deltaY / canvasState.zoom;
        onCanvasPan(dx, dy);
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [canvasState.zoom, isZoomModifierActive, onZoomAtPoint, onCanvasPan]);

  // --- Optimized Connections Rendering ---
  const connectionPaths = React.useMemo(() => {
    return connections.map((conn) => {
      const fromNode = nodeMap.get(conn.fromNodeId);
      const toNode = nodeMap.get(conn.toNodeId);
      if (!fromNode || !toNode) return null;

      // Calculate positions using constants
      const fromPortY = PORTS_TOP + conn.fromPortIndex * (PORT_SIZE + PORT_GAP) + PORT_SIZE / 2 + PORT_Y_OFFSET;
      const fromX = fromNode.x + NODE_WIDTH;
      const fromY = fromNode.y + fromPortY;

      const toPortY = PORTS_TOP + 0 * (PORT_SIZE + PORT_GAP) + PORT_SIZE / 2 + PORT_Y_OFFSET;
      const toX = toNode.x;
      const toY = toNode.y + toPortY;

      // Smart(er) Routing
      const dist = Math.abs(toX - fromX);
      // Standard curvature for typical distance, reduced for very close nodes
      const curvature = Math.max(40, Math.min(dist * 0.5, 150));
      
      const cp1X = fromX + curvature;
      const cp2X = toX - curvature;

      // Use the standard cubic bezier: start -> cp1 -> cp2 -> end
      const path = `M ${fromX} ${fromY} C ${cp1X} ${fromY}, ${cp2X} ${toY}, ${toX} ${toY}`;

      const stroke = conn.color || (conn.providerId ? PROVIDER_COLORS[conn.providerId] : undefined) || 'var(--connection-stroke)';

      return (
        <path
          key={conn.id}
          className="canvas-connection"
          d={path}
          fill="none"
          stroke={stroke}
          style={stroke ? { stroke } : undefined}
        />
      );
    });
  }, [nodeMap, connections]);

  return (
    <main className="canvas-container" onContextMenu={handleContextMenu}>
      <div
        ref={canvasRef}
        className={`canvas-view ${canvasState.tool === 'hand' ? 'canvas-view--hand' : ''} ${isPanning ? 'canvas-view--panning' : ''}`}
        onMouseDown={handleCanvasMouseDown}
        style={{
          backgroundSize: `${24 * canvasState.zoom}px ${24 * canvasState.zoom}px`,
          backgroundPosition: `${canvasState.offsetX * canvasState.zoom}px ${canvasState.offsetY * canvasState.zoom}px`,
        }}
      >
        <div
          className="canvas-inner"
          style={{
            transform: `scale(${canvasState.zoom}) translate(${canvasState.offsetX}px, ${canvasState.offsetY}px)`,
          }}
        >
          <svg className="canvas-connections">
            {connectionPaths}
          </svg>

          <div className="canvas-legend">
            {Object.entries(PROVIDER_COLORS).map(([providerId, color]) => (
              <div className="canvas-legend__item" key={providerId}>
                <span className="canvas-legend__dot" style={{ backgroundColor: color }} />
                <span className="canvas-legend__label">{providerId}</span>
              </div>
            ))}
          </div>

          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              isDragging={draggingNodeId === node.id}
              isSelected={selectedNodeIds.has(node.id)}
              councilMode={councilMode}
              councilName={councilName}
              onHeaderMouseDown={(e) => handleNodeHeaderMouseDown(e, node)}
              onPromptChange={(prompt) => onNodePromptChange(node.id, prompt)}
              onBranchCountChange={(count) => onNodeBranchCountChange(node.id, count)}
              onDeepLevelChange={(level) => onNodeDeepLevelChange(node.id, level)}
              onModelChange={(modelId, providerId) => onNodeModelChange(node.id, modelId, providerId)}
              onPlay={() => onPlayNode(node.id)}
              onPlayCouncil={onPlayCouncil ? () => onPlayCouncil(node.id) : undefined}
              onPlayMultiModel={onPlayMultiModel ? () => onPlayMultiModel(node.id) : undefined}
              onClick={(e) => {
                e.stopPropagation();
                selectNode(node.id, e.shiftKey);
              }}
            />
          ))}
        </div>
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </main>
  );
};
