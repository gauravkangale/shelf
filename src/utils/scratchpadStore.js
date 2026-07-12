const DB_NAME = 'ShelfScratchpadDB';
const DB_VERSION = 1;
const STORE_NAME = 'scratchpad_content';

function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => {
      resolve(e.target.result);
    };
    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
}

export async function getScratchpadContent(userKey) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(userKey);
      request.onsuccess = () => {
        resolve(request.result || '');
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('Failed to get scratchpad content from IndexedDB:', err);
    // Fallback to localStorage
    try {
      return localStorage.getItem(userKey) || '';
    } catch {
      return '';
    }
  }
}

export async function setScratchpadContent(userKey, content) {
  // Save to localStorage immediately as a synchronous cache
  try {
    localStorage.setItem(userKey, content);
  } catch (e) {
    console.error('localStorage cache write failed:', e);
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(content, userKey);
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('Failed to save scratchpad content to IndexedDB:', err);
  }
}
