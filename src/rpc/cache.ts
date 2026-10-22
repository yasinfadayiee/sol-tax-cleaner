/**
 * Transactions never change once confirmed, so we keep them in IndexedDB keyed by signature.
 * Re-running an analysis is then nearly free. Falls back to memory if IndexedDB is unavailable.
 */
export interface TxCache {
  get(signature: string): Promise<unknown | undefined>
  put(signature: string, tx: unknown): Promise<void>
}

const DB = 'stc-cache'
const STORE = 'tx'

export class MemoryCache implements TxCache {
  private map = new Map<string, unknown>()
  async get(signature: string) {
    return this.map.get(signature)
  }
  async put(signature: string, tx: unknown) {
    this.map.set(signature, tx)
  }
}

export class IdbCache implements TxCache {
  private db: Promise<IDBDatabase>

  constructor(factory: IDBFactory = indexedDB) {
    this.db = new Promise((resolve, reject) => {
      const req = factory.open(DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  private async run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
    const db = await this.db
    return new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result as T)
      req.onerror = () => reject(req.error)
    })
  }

  async get(signature: string) {
    try {
      return await this.run<unknown>('readonly', (s) => s.get(signature))
    } catch {
      return undefined
    }
  }

  async put(signature: string, tx: unknown) {
    try {
      await this.run('readwrite', (s) => s.put(tx, signature))
    } catch {
      // Quota or private mode: the cache is an optimisation only.
    }
  }
}

export function makeCache(): TxCache {
  try {
    if (typeof indexedDB !== 'undefined') return new IdbCache()
  } catch {
    // fall through
  }
  return new MemoryCache()
}
