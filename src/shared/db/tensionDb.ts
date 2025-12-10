import { openDB, IDBPDatabase } from 'idb';

export type TensionDb = IDBPDatabase<unknown>;

const DB_NAME = 'tension-db';
const DB_VERSION = 1;

export async function getTensionDb(): Promise<TensionDb> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
      if (!db.objectStoreNames.contains('threads')) {
        const store = db.createObjectStore('threads', { keyPath: 'id' });
        store.createIndex('by-updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains('nodes')) {
        const store = db.createObjectStore('nodes', { keyPath: 'id' });
        store.createIndex('by-threadId', 'threadId');
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
