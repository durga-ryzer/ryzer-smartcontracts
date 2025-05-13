declare module 'idb' {
  export interface DBSchema {
    [tableName: string]: {
      key: string | number;
      value: any;
      indexes?: {
        [indexName: string]: string | string[];
      };
    };
  }
  
  // Allow specific schema types to be used with IDBPDatabase

  export interface IDBPDatabase<T extends DBSchema> {
    name: string;
    version: number;
    objectStoreNames: string[];
    transaction<K extends keyof T>(
      storeNames: K | K[],
      mode?: 'readonly' | 'readwrite'
    ): IDBPTransaction<T, K>;
    createObjectStore<K extends keyof T>(
      name: K,
      options?: { keyPath?: string; autoIncrement?: boolean }
    ): IDBPObjectStore<T, K>;
    get<K extends keyof T>(
      storeName: K,
      key: T[K]['key']
    ): Promise<T[K]['value'] | undefined>;
    getAll<K extends keyof T>(
      storeName: K,
      query?: IDBKeyRange | T[K]['key'],
      count?: number
    ): Promise<T[K]['value'][]>;
    getAllFromIndex<K extends keyof T>(
      storeName: K,
      indexName: string,
      query: any,
      count?: number
    ): Promise<T[K]['value'][]>;
    put<K extends keyof T>(
      storeName: K,
      value: T[K]['value'],
      key?: T[K]['key']
    ): Promise<T[K]['key']>;
    add<K extends keyof T>(
      storeName: K,
      value: T[K]['value'],
      key?: T[K]['key']
    ): Promise<T[K]['key']>;
    delete<K extends keyof T>(
      storeName: K,
      key: T[K]['key']
    ): Promise<void>;
    clear<K extends keyof T>(
      storeName: K
    ): Promise<void>;
    close(): void;
  }

  export interface IDBPTransaction<T extends DBSchema, K extends keyof T> {
    objectStoreNames: string[];
    mode: 'readonly' | 'readwrite' | 'versionchange';
    objectStore<N extends K>(name: N): IDBPObjectStore<T, N>;
    done: Promise<void>;
    commit(): void;
    abort(): void;
  }

  export interface IDBPObjectStore<T extends DBSchema, K extends keyof T> {
    name: string;
    keyPath: string | string[];
    indexNames: string[];
    autoIncrement: boolean;
    get(key: T[K]['key']): Promise<T[K]['value'] | undefined>;
    getAll(
      query?: IDBKeyRange | T[K]['key'],
      count?: number
    ): Promise<T[K]['value'][]>;
    put(
      value: T[K]['value'],
      key?: T[K]['key']
    ): Promise<T[K]['key']>;
    add(
      value: T[K]['value'],
      key?: T[K]['key']
    ): Promise<T[K]['key']>;
    delete(key: T[K]['key']): Promise<void>;
    clear(): Promise<void>;
    index(name: string): IDBPIndex<T, K>;
    createIndex(
      name: string,
      keyPath: string | string[],
      options?: { unique?: boolean; multiEntry?: boolean }
    ): IDBPIndex<T, K>;
    deleteIndex(name: string): void;
  }

  export interface IDBPIndex<T extends DBSchema, K extends keyof T> {
    name: string;
    keyPath: string | string[];
    multiEntry: boolean;
    unique: boolean;
    get(key: any): Promise<T[K]['value'] | undefined>;
    getAll(
      query?: IDBKeyRange | any,
      count?: number
    ): Promise<T[K]['value'][]>;
    getKey(key: any): Promise<T[K]['key'] | undefined>;
    getAllKeys(
      query?: IDBKeyRange | any,
      count?: number
    ): Promise<T[K]['key'][]>;
  }

  export function openDB<T extends DBSchema>(
    name: string,
    version: number,
    options?: {
      upgrade?: (db: IDBPDatabase<T>, oldVersion: number, newVersion: number) => void;
      blocked?: () => void;
      blocking?: () => void;
      terminated?: () => void;
    }
  ): Promise<IDBPDatabase<T>>;
}
