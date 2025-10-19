import { logger } from '@/lib/logger';

export const storage: Set<string> = new Set<string>();
export const temporaryStorage: Set<`0x${string}`> = new Set<`0x${string}`>();

export const addToStorage = (hash: string) => {
  logger.info('adding to storage', hash);
  storage.add(hash);
};

export const findInStorage = (hash: string) => {
  return storage.has(hash);
};
