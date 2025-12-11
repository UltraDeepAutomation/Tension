import { openDB, IDBPDatabase } from 'idb';

export type TensionDb = IDBPDatabase<unknown>;

const DB_NAME = 'tension-db';
const DB_VERSION = 3;

export interface ChatRecord {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface NodeRecord {
  id: string;
  chatId: string;
  [key: string]: unknown;
}

export interface ConnectionRecord {
  id: string;
  chatId: string;
  [key: string]: unknown;
}

export async function getTensionDb(): Promise<TensionDb> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
      
      // Chats store (renamed from threads)
      if (!db.objectStoreNames.contains('chats')) {
        const store = db.createObjectStore('chats', { keyPath: 'id' });
        store.createIndex('by-updatedAt', 'updatedAt');
      }
      
      // Nodes store with chatId index
      if (!db.objectStoreNames.contains('nodes')) {
        const store = db.createObjectStore('nodes', { keyPath: 'id' });
        store.createIndex('by-chatId', 'chatId');
      } else if (oldVersion < 3) {
        // Add chatId index if upgrading
        const tx = (db as any).transaction('nodes', 'readwrite');
        if (tx && !tx.objectStore('nodes').indexNames.contains('by-chatId')) {
          tx.objectStore('nodes').createIndex('by-chatId', 'chatId');
        }
      }

      // Connections store with chatId index
      if (!db.objectStoreNames.contains('connections')) {
        const store = db.createObjectStore('connections', { keyPath: 'id' });
        store.createIndex('by-chatId', 'chatId');
      } else if (oldVersion < 3) {
        const tx = (db as any).transaction('connections', 'readwrite');
        if (tx && !tx.objectStore('connections').indexNames.contains('by-chatId')) {
          tx.objectStore('connections').createIndex('by-chatId', 'chatId');
        }
      }
      
      // Remove old threads store if exists
      if (db.objectStoreNames.contains('threads')) {
        db.deleteObjectStore('threads');
      }
    },
  });
}

export async function saveSetting<T = unknown>(key: string, value: T): Promise<void> {
  const db = await getTensionDb();
  await db.put('settings', value, key);
}

export async function readSetting<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getTensionDb();
  return db.get('settings', key) as Promise<T | undefined>;
}

export async function saveNodes<T = unknown>(nodes: T[]): Promise<void> {
  const db = await getTensionDb();
  const tx = db.transaction('nodes', 'readwrite');
  await tx.store.clear();
  for (const node of nodes) {
    // ожидается, что у node есть поле id, соответствующее keyPath стора
    // типизация обобщённая, чтобы не тянуть доменные типы в shared слой
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await tx.store.put(node as any);
  }
  await tx.done;
}

export async function readNodes<T = unknown>(): Promise<T[]> {
  const db = await getTensionDb();
  const all = await db.getAll('nodes');
  return all as T[];
}

export async function saveConnections<T = unknown>(connections: T[]): Promise<void> {
  const db = await getTensionDb();
  const tx = db.transaction('connections', 'readwrite');
  await tx.store.clear();
  for (const connection of connections) {
    // ожидается, что у connection есть поле id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await tx.store.put(connection as any);
  }
  await tx.done;
}

export async function readConnections<T = unknown>(): Promise<T[]> {
  const db = await getTensionDb();
  const all = await db.getAll('connections');
  return all as T[];
}
