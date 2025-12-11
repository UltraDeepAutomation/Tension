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
  /** Контекст — прошлый запрос от родителя (показывается сверху) */
  context: string;
  /** Ответ модели на контекст (показывается по середине) */
  modelResponse: string | null;
  /** Новый вопрос пользователя (поле ввода снизу) */
  prompt: string;
  /** Количество веток (1-4) */
  branchCount: 1 | 2 | 3 | 4;
  /** Глубина рекурсии — модель перепроверяет себя (1-4) */
  deepLevel: 1 | 2 | 3 | 4;
  isRoot: boolean;
  isPlaying: boolean;
  error?: string;
  inputs: Port[];
  outputs: Port[];
}

export interface Connection {
  id: string;
  fromNodeId: NodeId;
  fromPortIndex: number;
  toNodeId: NodeId;
  toPortIndex: number;
}
