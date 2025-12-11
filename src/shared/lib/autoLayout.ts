import type { Node, Connection } from '@/entities/node/model/types';

interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;
  direction?: 'horizontal' | 'vertical';
}

interface LayoutResult {
  nodes: Node[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  nodeWidth: 320,
  nodeHeight: 200,
  horizontalGap: 100,
  verticalGap: 80,
  direction: 'horizontal',
};

/**
 * Build adjacency map from connections
 */
function buildAdjacencyMap(connections: Connection[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  
  connections.forEach(conn => {
    const children = map.get(conn.fromNodeId) || [];
    children.push(conn.toNodeId);
    map.set(conn.fromNodeId, children);
  });
  
  return map;
}

/**
 * Find root nodes (nodes with no incoming connections)
 */
function findRootNodes(nodes: Node[], connections: Connection[]): Node[] {
  const hasIncoming = new Set(connections.map(c => c.toNodeId));
  return nodes.filter(n => !hasIncoming.has(n.id));
}

/**
 * Calculate tree depth for each node using BFS
 */
function calculateDepths(
  roots: Node[],
  adjacencyMap: Map<string, string[]>,
  nodeMap: Map<string, Node>
): Map<string, number> {
  const depths = new Map<string, number>();
  const queue: { nodeId: string; depth: number }[] = [];
  
  // Start with roots at depth 0
  roots.forEach(root => {
    depths.set(root.id, 0);
    queue.push({ nodeId: root.id, depth: 0 });
  });
  
  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    const children = adjacencyMap.get(nodeId) || [];
    
    children.forEach(childId => {
      if (!depths.has(childId)) {
        depths.set(childId, depth + 1);
        queue.push({ nodeId: childId, depth: depth + 1 });
      }
    });
  }
  
  // Handle orphan nodes (no connections)
  nodeMap.forEach((node, id) => {
    if (!depths.has(id)) {
      depths.set(id, 0);
    }
  });
  
  return depths;
}

/**
 * Group nodes by their depth level
 */
function groupByDepth(
  nodes: Node[],
  depths: Map<string, number>
): Map<number, Node[]> {
  const groups = new Map<number, Node[]>();
  
  nodes.forEach(node => {
    const depth = depths.get(node.id) || 0;
    const group = groups.get(depth) || [];
    group.push(node);
    groups.set(depth, group);
  });
  
  return groups;
}

/**
 * Auto-layout nodes in a tree structure
 * Uses a simple layered approach with horizontal or vertical direction
 */
export function autoLayoutNodes(
  nodes: Node[],
  connections: Connection[],
  options: LayoutOptions = {}
): LayoutResult {
  if (nodes.length === 0) {
    return { nodes: [], bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
  }
  
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adjacencyMap = buildAdjacencyMap(connections);
  
  // Find roots and calculate depths
  let roots = findRootNodes(nodes, connections);
  if (roots.length === 0) {
    // If no clear roots (circular graph), use first node
    roots = [nodes[0]];
  }
  
  const depths = calculateDepths(roots, adjacencyMap, nodeMap);
  const groups = groupByDepth(nodes, depths);
  
  // Calculate positions
  const layoutedNodes: Node[] = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  const maxDepth = Math.max(...Array.from(groups.keys()));
  
  groups.forEach((groupNodes, depth) => {
    const groupSize = groupNodes.length;
    
    groupNodes.forEach((node, index) => {
      let x: number, y: number;
      
      if (opts.direction === 'horizontal') {
        // Horizontal: depth goes right, siblings go down
        x = depth * (opts.nodeWidth + opts.horizontalGap);
        const totalHeight = groupSize * opts.nodeHeight + (groupSize - 1) * opts.verticalGap;
        const startY = -totalHeight / 2;
        y = startY + index * (opts.nodeHeight + opts.verticalGap);
      } else {
        // Vertical: depth goes down, siblings go right
        y = depth * (opts.nodeHeight + opts.verticalGap);
        const totalWidth = groupSize * opts.nodeWidth + (groupSize - 1) * opts.horizontalGap;
        const startX = -totalWidth / 2;
        x = startX + index * (opts.nodeWidth + opts.horizontalGap);
      }
      
      layoutedNodes.push({
        ...node,
        x,
        y,
      });
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + opts.nodeWidth);
      maxY = Math.max(maxY, y + opts.nodeHeight);
    });
  });
  
  return {
    nodes: layoutedNodes,
    bounds: { minX, minY, maxX, maxY },
  };
}

/**
 * Arrange selected nodes in a grid pattern
 */
export function arrangeInGrid(
  nodes: Node[],
  options: LayoutOptions = {}
): Node[] {
  if (nodes.length === 0) return [];
  
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const columns = Math.ceil(Math.sqrt(nodes.length));
  
  // Find the center of current selection
  const centerX = nodes.reduce((sum, n) => sum + n.x, 0) / nodes.length;
  const centerY = nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length;
  
  const totalWidth = columns * opts.nodeWidth + (columns - 1) * opts.horizontalGap;
  const rows = Math.ceil(nodes.length / columns);
  const totalHeight = rows * opts.nodeHeight + (rows - 1) * opts.verticalGap;
  
  const startX = centerX - totalWidth / 2;
  const startY = centerY - totalHeight / 2;
  
  return nodes.map((node, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    
    return {
      ...node,
      x: startX + col * (opts.nodeWidth + opts.horizontalGap),
      y: startY + row * (opts.nodeHeight + opts.verticalGap),
    };
  });
}

/**
 * Align nodes horizontally (same Y)
 */
export function alignHorizontally(nodes: Node[]): Node[] {
  if (nodes.length === 0) return [];
  
  const avgY = nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length;
  
  return nodes.map(node => ({
    ...node,
    y: avgY,
  }));
}

/**
 * Align nodes vertically (same X)
 */
export function alignVertically(nodes: Node[]): Node[] {
  if (nodes.length === 0) return [];
  
  const avgX = nodes.reduce((sum, n) => sum + n.x, 0) / nodes.length;
  
  return nodes.map(node => ({
    ...node,
    x: avgX,
  }));
}

/**
 * Distribute nodes evenly horizontally
 */
export function distributeHorizontally(nodes: Node[], nodeWidth = 320): Node[] {
  if (nodes.length < 2) return nodes;
  
  const sorted = [...nodes].sort((a, b) => a.x - b.x);
  const minX = sorted[0].x;
  const maxX = sorted[sorted.length - 1].x;
  const totalSpan = maxX - minX;
  const gap = totalSpan / (nodes.length - 1);
  
  return sorted.map((node, index) => ({
    ...node,
    x: minX + index * gap,
  }));
}

/**
 * Distribute nodes evenly vertically
 */
export function distributeVertically(nodes: Node[], nodeHeight = 200): Node[] {
  if (nodes.length < 2) return nodes;
  
  const sorted = [...nodes].sort((a, b) => a.y - b.y);
  const minY = sorted[0].y;
  const maxY = sorted[sorted.length - 1].y;
  const totalSpan = maxY - minY;
  const gap = totalSpan / (nodes.length - 1);
  
  return sorted.map((node, index) => ({
    ...node,
    y: minY + index * gap,
  }));
}
