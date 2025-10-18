export const storage: Set<string> = new Set<string>();
export const temporaryStorage: Set<`0x${string}`> = new Set<`0x${string}`>();

export const addToStorage = (hash: string) => {
  storage.add(hash);
};

export const findInStorage = (hash: string) => {
  return storage.has(hash);
};
