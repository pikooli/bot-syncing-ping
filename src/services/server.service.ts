import { parsePingHistory, sendPong } from '@/services/web3.service';
import {
  addToStorage,
  storage,
  findInStorage,
  temporaryStorage,
} from '@/lib/storage';
import { insertIntoDbStorage } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export const iterateOverPing = async (
  initialBlock: number,
  endBlock?: number,
) => {
  const { history } = await parsePingHistory(initialBlock, endBlock);
  for (const item of history) {
    if (
      findInStorage(item.transactionHash) ||
      temporaryStorage.has(item.transactionHash as `0x${string}`)
    ) {
      continue;
    }
    try {
      temporaryStorage.add(item.transactionHash as `0x${string}`);
      await sendPong(item.transactionHash);

      temporaryStorage.delete(item.transactionHash as `0x${string}`);
      addToStorage(item.transactionHash);
      await insertIntoDbStorage(Array.from(storage));
    } catch (error) {
      temporaryStorage.delete(item.transactionHash as `0x${string}`);
      logger.error('[iterateOverPing] Error sending pong', error);
      throw error;
    }
  }
};
