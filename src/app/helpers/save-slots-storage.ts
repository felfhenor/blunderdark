// Low-level IndexedDB operations for save slots.
// Extracted to a separate module for testability (can be mocked in specs).

const SAVE_DB_NAME = 'gamestorage';
const SAVE_STORE_NAME = 'gamestate';
const SAVE_DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SAVE_DB_NAME, SAVE_DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SAVE_STORE_NAME)) {
        db.createObjectStore(SAVE_STORE_NAME);
      }
    };
  });
}

export async function saveSlotStorageGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([SAVE_STORE_NAME], 'readonly');
    const store = tx.objectStore(SAVE_STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSlotStoragePut<T>(key: string, value: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([SAVE_STORE_NAME], 'readwrite');
    const store = tx.objectStore(SAVE_STORE_NAME);
    const request = store.put(value, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveSlotStorageDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([SAVE_STORE_NAME], 'readwrite');
    const store = tx.objectStore(SAVE_STORE_NAME);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
