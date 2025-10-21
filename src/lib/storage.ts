import { logger } from '@/lib/logger';
// this is a simple storage system that is used to store the transactions hashes that have been sent
// it is used to avoid sending the same transaction twice
// should not be a set, because it is not optimized for performance
// but for simplicity and ease of use, if real use , use something like redis

export const storage: Set<string> = new Set<string>();
export const temporaryStorage: Set<`0x${string}`> = new Set<`0x${string}`>();

export const addToStorage = (hash: string) => {
  logger.info('[addToStorage] adding to storage', hash);
  storage.add(hash);
};

export const findInStorage = (hash: string) => {
  return storage.has(hash);
};
