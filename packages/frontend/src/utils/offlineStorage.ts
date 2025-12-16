/**
 * Offline Storage Utilities
 * Manages IndexedDB for offline data caching
 */

const DB_NAME = 'zena-offline-db';
const DB_VERSION = 1;

// Store names
export const STORES = {
  THREADS: 'threads',
  CONTACTS: 'contacts',
  PROPERTIES: 'properties',
  DEALS: 'deals',
  TIMELINE: 'timeline',
  TASKS: 'tasks',
  SYNC_QUEUE: 'sync_queue',
  METADATA: 'metadata',
} as const;

export interface SyncQueueItem {
  id: string;
  action: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  timestamp: number;
  retryCount: number;
}

export interface MetadataEntry {
  key: string;
  value: any;
  lastUpdated: number;
}

/**
 * Initialize IndexedDB database
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.THREADS)) {
        const threadStore = db.createObjectStore(STORES.THREADS, { keyPath: 'id' });
        threadStore.createIndex('category', 'category', { unique: false });
        threadStore.createIndex('lastMessageAt', 'lastMessageAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CONTACTS)) {
        const contactStore = db.createObjectStore(STORES.CONTACTS, { keyPath: 'id' });
        contactStore.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PROPERTIES)) {
        db.createObjectStore(STORES.PROPERTIES, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.DEALS)) {
        const dealStore = db.createObjectStore(STORES.DEALS, { keyPath: 'id' });
        dealStore.createIndex('stage', 'stage', { unique: false });
        dealStore.createIndex('riskLevel', 'riskLevel', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.TIMELINE)) {
        const timelineStore = db.createObjectStore(STORES.TIMELINE, { keyPath: 'id' });
        timelineStore.createIndex('entityId', 'entityId', { unique: false });
        timelineStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.TASKS)) {
        const taskStore = db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
        taskStore.createIndex('status', 'status', { unique: false });
        taskStore.createIndex('dueDate', 'dueDate', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Generic function to save data to a store
 */
export async function saveToStore<T>(storeName: string, data: T | T[]): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);

  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    store.put(item);
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Generic function to get data from a store
 */
export async function getFromStore<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await initDB();
  const transaction = db.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);
  const request = store.get(id);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Generic function to get all data from a store
 */
export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await initDB();
  const transaction = db.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Delete data from a store
 */
export async function deleteFromStore(storeName: string, id: string): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  store.delete(id);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Clear all data from a store
 */
export async function clearStore(storeName: string): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  store.clear();

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Add action to sync queue
 */
export async function queueAction(
  action: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  data?: any
): Promise<void> {
  const queueItem: SyncQueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    action,
    endpoint,
    method,
    data,
    timestamp: Date.now(),
    retryCount: 0,
  };

  await saveToStore(STORES.SYNC_QUEUE, queueItem);
}

/**
 * Get all queued actions
 */
export async function getQueuedActions(): Promise<SyncQueueItem[]> {
  return getAllFromStore<SyncQueueItem>(STORES.SYNC_QUEUE);
}

/**
 * Remove action from sync queue
 */
export async function removeQueuedAction(id: string): Promise<void> {
  await deleteFromStore(STORES.SYNC_QUEUE, id);
}

/**
 * Update metadata (e.g., last sync time)
 */
export async function updateMetadata(key: string, value: any): Promise<void> {
  const metadata: MetadataEntry = {
    key,
    value,
    lastUpdated: Date.now(),
  };
  await saveToStore(STORES.METADATA, metadata);
}

/**
 * Get metadata value
 */
export async function getMetadata(key: string): Promise<any> {
  const metadata = await getFromStore<MetadataEntry>(STORES.METADATA, key);
  return metadata?.value;
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime(): Promise<number | null> {
  const lastSync = await getMetadata('lastSyncTime');
  return lastSync || null;
}

/**
 * Update last sync timestamp
 */
export async function updateLastSyncTime(): Promise<void> {
  await updateMetadata('lastSyncTime', Date.now());
}
