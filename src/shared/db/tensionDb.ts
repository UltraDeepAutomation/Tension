import { openDB, IDBPDatabase } from 'idb';

export type TensionDb = IDBPDatabase<unknown>;

const DB_NAME = 'tension-db';
const DB_VERSION = 4; // Increment version to retry upgrade

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
    upgrade(db, oldVersion, newVersion, transaction) {
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
      } else {
        // Add chatId index if upgrading and it doesn't exist
        const store = transaction.objectStore('nodes');
        if (!store.indexNames.contains('by-chatId')) {
          store.createIndex('by-chatId', 'chatId');
        }
      }

      // Connections store with chatId index
      if (!db.objectStoreNames.contains('connections')) {
        const store = db.createObjectStore('connections', { keyPath: 'id' });
        store.createIndex('by-chatId', 'chatId');
      } else {
        const store = transaction.objectStore('connections');
        if (!store.indexNames.contains('by-chatId')) {
          store.createIndex('by-chatId', 'chatId');
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

// --- Chats ---

export async function readChats(): Promise<ChatRecord[]> {
  const db = await getTensionDb();
  // getAllFromIndex возвращает отсортированные по возрастанию ключа (updatedAt)
  const chats = await db.getAllFromIndex('chats', 'by-updatedAt');
  // Нам нужно desc (новые сверху)
  return (chats as ChatRecord[]).reverse();
}

export async function saveChat(chat: ChatRecord): Promise<void> {
  const db = await getTensionDb();
  await db.put('chats', chat);
}

export async function deleteChat(chatId: string): Promise<void> {
  const db = await getTensionDb();
  const tx = db.transaction(['chats', 'nodes', 'connections'], 'readwrite');

  // 1. Delete chat
  await tx.objectStore('chats').delete(chatId);

  // 2. Delete nodes for this chat
  const nodesIndex = tx.objectStore('nodes').index('by-chatId');
  const nodeKeys = await nodesIndex.getAllKeys(chatId);
  for (const key of nodeKeys) {
    await tx.objectStore('nodes').delete(key);
  }

  // 3. Delete connections for this chat
  const connIndex = tx.objectStore('connections').index('by-chatId');
  const connKeys = await connIndex.getAllKeys(chatId);
  for (const key of connKeys) {
    await tx.objectStore('connections').delete(key);
  }

  await tx.done;
}

// --- Nodes by Chat ---

export async function readNodesByChat<T = unknown>(chatId: string): Promise<T[]> {
  const db = await getTensionDb();
  const nodes = await db.getAllFromIndex('nodes', 'by-chatId', chatId);
  return nodes as T[];
}

export async function saveNodesByChat<T extends { id: string }>(chatId: string, nodes: T[]): Promise<void> {
  const db = await getTensionDb();
  const tx = db.transaction('nodes', 'readwrite');
  const store = tx.objectStore('nodes');
  const index = store.index('by-chatId');

  // 1. Находим все существующие ноды этого чата
  const existingKeys = await index.getAllKeys(chatId);
  const newIds = new Set(nodes.map(n => n.id));

  // 2. Удаляем те, которых нет в новом списке
  for (const key of existingKeys) {
    // Внимание: key может быть не id, если keyPath другой, но у нас keyPath='id'
    if (!newIds.has(key as string)) {
      await store.delete(key);
    }
  }

  // 3. Сохраняем/обновляем новые (с принудительным chatId)
  for (const node of nodes) {
    await store.put({ ...node, chatId });
  }

  await tx.done;
}

// --- Connections by Chat ---

export async function readConnectionsByChat<T = unknown>(chatId: string): Promise<T[]> {
  const db = await getTensionDb();
  const conns = await db.getAllFromIndex('connections', 'by-chatId', chatId);
  return conns as T[];
}

export async function saveConnectionsByChat<T extends { id: string }>(chatId: string, connections: T[]): Promise<void> {
  const db = await getTensionDb();
  const tx = db.transaction('connections', 'readwrite');
  const store = tx.objectStore('connections');
  const index = store.index('by-chatId');

  // 1. Находим все существующие connections этого чата
  const existingKeys = await index.getAllKeys(chatId);
  const newIds = new Set(connections.map(c => c.id));

  // 2. Удаляем исчезнувшие
  for (const key of existingKeys) {
    if (!newIds.has(key as string)) {
      await store.delete(key);
    }
  }

  // 3. Сохраняем новые
  for (const conn of connections) {
    await store.put({ ...conn, chatId });
  }

  await tx.done;
}

// Deprecated global methods (для совместимости, пока не удалим везде)
export async function saveNodes<T = unknown>(nodes: T[]): Promise<void> {
    // No-op or unsafe legacy
    console.warn('saveNodes is deprecated, use saveNodesByChat');
}
export async function readNodes<T = unknown>(): Promise<T[]> {
    const db = await getTensionDb();
    return (await db.getAll('nodes')) as T[];
}
export async function saveConnections<T = unknown>(connections: T[]): Promise<void> {
    console.warn('saveConnections is deprecated, use saveConnectionsByChat');
}
export async function readConnections<T = unknown>(): Promise<T[]> {
    const db = await getTensionDb();
    return (await db.getAll('connections')) as T[];
}
