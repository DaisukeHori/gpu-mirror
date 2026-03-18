interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const storageModule =
  typeof window !== 'undefined' && typeof document !== 'undefined'
    ? require('./storage.web')
    : require('./storage.native');

export const storage: StorageAdapter = storageModule.storage;
