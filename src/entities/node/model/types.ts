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

/** Тип ноды */
export type NodeType = 'standard' | 'council' | 'evaluation' | 'synthesis';

/** ID провайдера LLM */
export type ProviderId = 'openai' | 'anthropic' | 'google' | 'openrouter' | 'xai' | 'ollama';

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
  
  /** Тип ноды (standard, council, etc.) */
  type?: NodeType;
  /** Провайдер, использованный для генерации ответа */
  providerId?: ProviderId;
  /** ID модели, использованной для генерации */
  modelId?: string;
  /** Confidence score для council нод (0-1) */
  confidence?: number;
  /** ID совета для council нод */
  councilId?: string;
}

export interface Connection {
  id: string;
  fromNodeId: NodeId;
  fromPortIndex: number;
  toNodeId: NodeId;
  toPortIndex: number;
  /** Цвет соединения для визуализации (связан с providerId) */
  color?: string;
  /** Провайдер, задающий цвет линии */
  providerId?: ProviderId;
}
