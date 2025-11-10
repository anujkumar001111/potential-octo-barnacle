/**
 * IndexedDB Browser Storage Service
 *
 * Manages browser tabs, workspaces, and favorites in IndexedDB.
 * Provides CRUD operations with proper error handling and type safety.
 */

import type { BrowserTab, Workspace, Favorite, BrowserTabState } from '@/type';

// Database configuration
const DB_NAME = 'manus-browser-db';
const DB_VERSION = 1;

// Store names
const STORE_TABS = 'tabs';
const STORE_WORKSPACES = 'workspaces';
const STORE_FAVORITES = 'favorites';

/**
 * Opens the IndexedDB database and creates object stores if needed
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create tabs store with indexes
      if (!db.objectStoreNames.contains(STORE_TABS)) {
        const tabsStore = db.createObjectStore(STORE_TABS, { keyPath: 'id' });
        tabsStore.createIndex('by-workspace', 'workspaceId', { unique: false });
        tabsStore.createIndex('by-pinned', 'isPinned', { unique: false });
        tabsStore.createIndex('by-lastAccessed', 'lastAccessedAt', { unique: false });
      }

      // Create workspaces store with indexes
      if (!db.objectStoreNames.contains(STORE_WORKSPACES)) {
        const workspacesStore = db.createObjectStore(STORE_WORKSPACES, { keyPath: 'id' });
        workspacesStore.createIndex('by-active', 'isActive', { unique: false });
        workspacesStore.createIndex('by-order', 'order', { unique: false });
      }

      // Create favorites store with indexes
      if (!db.objectStoreNames.contains(STORE_FAVORITES)) {
        const favoritesStore = db.createObjectStore(STORE_FAVORITES, { keyPath: 'id' });
        favoritesStore.createIndex('by-order', 'order', { unique: false });
      }
    };
  });
}

/**
 * Generic function to get all items from a store
 */
async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as T[]);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get all from ${storeName}: ${request.error?.message}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Generic function to get a single item by ID
 */
async function getItemById<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result as T | undefined);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get item from ${storeName}: ${request.error?.message}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Generic function to add or update an item
 */
async function putItem<T>(storeName: string, item: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Failed to put item in ${storeName}: ${request.error?.message}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Generic function to delete an item by ID
 */
async function deleteItem(storeName: string, id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Failed to delete item from ${storeName}: ${request.error?.message}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Clear all items from a store
 */
async function clearStore(storeName: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Failed to clear ${storeName}: ${request.error?.message}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// ============================================================================
// TABS API
// ============================================================================

export const tabsStorage = {
  async getAll(): Promise<BrowserTab[]> {
    return getAllFromStore<BrowserTab>(STORE_TABS);
  },

  async getById(id: string): Promise<BrowserTab | undefined> {
    return getItemById<BrowserTab>(STORE_TABS, id);
  },

  async save(tab: BrowserTab): Promise<void> {
    return putItem(STORE_TABS, tab);
  },

  async saveAll(tabs: BrowserTab[]): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_TABS, 'readwrite');
      const store = transaction.objectStore(STORE_TABS);

      tabs.forEach((tab) => {
        store.put(tab);
      });

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error(`Failed to save all tabs: ${transaction.error?.message}`));
      };
    });
  },

  async delete(id: string): Promise<void> {
    return deleteItem(STORE_TABS, id);
  },

  async getByWorkspace(workspaceId: string): Promise<BrowserTab[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_TABS, 'readonly');
      const store = transaction.objectStore(STORE_TABS);
      const index = store.index('by-workspace');
      const request = index.getAll(workspaceId);

      request.onsuccess = () => {
        resolve(request.result as BrowserTab[]);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get tabs by workspace: ${request.error?.message}`));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  async getPinned(): Promise<BrowserTab[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_TABS, 'readonly');
      const store = transaction.objectStore(STORE_TABS);
      const index = store.index('by-pinned');
      const request = index.getAll(true);

      request.onsuccess = () => {
        resolve(request.result as BrowserTab[]);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get pinned tabs: ${request.error?.message}`));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  async clear(): Promise<void> {
    return clearStore(STORE_TABS);
  }
};

// ============================================================================
// WORKSPACES API
// ============================================================================

export const workspacesStorage = {
  async getAll(): Promise<Workspace[]> {
    return getAllFromStore<Workspace>(STORE_WORKSPACES);
  },

  async getById(id: string): Promise<Workspace | undefined> {
    return getItemById<Workspace>(STORE_WORKSPACES, id);
  },

  async save(workspace: Workspace): Promise<void> {
    return putItem(STORE_WORKSPACES, workspace);
  },

  async saveAll(workspaces: Workspace[]): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_WORKSPACES, 'readwrite');
      const store = transaction.objectStore(STORE_WORKSPACES);

      workspaces.forEach((workspace) => {
        store.put(workspace);
      });

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error(`Failed to save all workspaces: ${transaction.error?.message}`));
      };
    });
  },

  async delete(id: string): Promise<void> {
    return deleteItem(STORE_WORKSPACES, id);
  },

  async getActive(): Promise<Workspace | undefined> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_WORKSPACES, 'readonly');
      const store = transaction.objectStore(STORE_WORKSPACES);
      const index = store.index('by-active');
      const request = index.getAll(true);

      request.onsuccess = () => {
        const results = request.result as Workspace[];
        resolve(results[0]); // Should only be one active workspace
      };

      request.onerror = () => {
        reject(new Error(`Failed to get active workspace: ${request.error?.message}`));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  async clear(): Promise<void> {
    return clearStore(STORE_WORKSPACES);
  }
};

// ============================================================================
// FAVORITES API
// ============================================================================

export const favoritesStorage = {
  async getAll(): Promise<Favorite[]> {
    const favorites = await getAllFromStore<Favorite>(STORE_FAVORITES);
    // Sort by order
    return favorites.sort((a, b) => a.order - b.order);
  },

  async getById(id: string): Promise<Favorite | undefined> {
    return getItemById<Favorite>(STORE_FAVORITES, id);
  },

  async save(favorite: Favorite): Promise<void> {
    return putItem(STORE_FAVORITES, favorite);
  },

  async saveAll(favorites: Favorite[]): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_FAVORITES, 'readwrite');
      const store = transaction.objectStore(STORE_FAVORITES);

      favorites.forEach((favorite) => {
        store.put(favorite);
      });

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error(`Failed to save all favorites: ${transaction.error?.message}`));
      };
    });
  },

  async delete(id: string): Promise<void> {
    return deleteItem(STORE_FAVORITES, id);
  },

  async clear(): Promise<void> {
    return clearStore(STORE_FAVORITES);
  }
};

// ============================================================================
// DATABASE UTILITIES
// ============================================================================

export const browserStorage = {
  /**
   * Initialize database and create default workspace
   */
  async initialize(): Promise<void> {
    try {
      const db = await openDatabase();
      db.close();

      // Check if we have any workspaces, if not create a default one
      const workspaces = await workspacesStorage.getAll();
      if (workspaces.length === 0) {
        const defaultWorkspace: Workspace = {
          id: 'workspace-default',
          name: 'Main',
          color: '#6366f1',
          icon: '🏠',
          tabIds: [],
          isActive: true,
          order: 0,
          createdAt: new Date(),
          lastAccessedAt: new Date()
        };
        await workspacesStorage.save(defaultWorkspace);
      }
    } catch (error) {
      console.error('[BrowserStorage] Failed to initialize:', error);
      throw error;
    }
  },

  /**
   * Clear all data from all stores
   */
  async clearAll(): Promise<void> {
    await tabsStorage.clear();
    await workspacesStorage.clear();
    await favoritesStorage.clear();
  },

  /**
   * Export all data for backup
   */
  async exportData(): Promise<{
    tabs: BrowserTab[];
    workspaces: Workspace[];
    favorites: Favorite[];
  }> {
    const [tabs, workspaces, favorites] = await Promise.all([
      tabsStorage.getAll(),
      workspacesStorage.getAll(),
      favoritesStorage.getAll()
    ]);

    return { tabs, workspaces, favorites };
  },

  /**
   * Import data from backup
   */
  async importData(data: {
    tabs: BrowserTab[];
    workspaces: Workspace[];
    favorites: Favorite[];
  }): Promise<void> {
    await Promise.all([
      tabsStorage.saveAll(data.tabs),
      workspacesStorage.saveAll(data.workspaces),
      favoritesStorage.saveAll(data.favorites)
    ]);
  }
};
