export type ThreadId = string;

export interface Thread {
  id: ThreadId;
  title: string;
  createdAt: number;
  updatedAt: number;
  rootNodeId: string;
}
