export type NodeId = string;
export type PortId = string;

export type PortType = 'input' | 'output';

export interface Port {
  id: PortId;
  nodeId: NodeId;
  type: PortType;
  dataType: 'text';
  index: number;
}

export interface Node {
  id: NodeId;
  x: number;
  y: number;
  prompt: string;
  modelResponse: string | null;
  branchCount: 1 | 2 | 3 | 4;
  isRoot: boolean;
  isPlaying: boolean;
  error?: string;
  inputs: Port[];
  outputs: Port[];
}

export interface Connection {
  id: string;
  fromPortId: PortId;
  toPortId: PortId;
}
