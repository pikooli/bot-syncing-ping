import { parsePingHistory } from '@/services/web3.service';
import { addToStorage, findInStorage, temporaryStorage } from '@/lib/storage';
import { supabaseDb } from '@/lib/supabase';
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

      temporaryStorage.delete(item.transactionHash as `0x${string}`);
      addToStorage(item.transactionHash);
      await supabaseDb.storage.insertIntoDbStorageModeQueue([
        {
          hash: item.transactionHash as `0x${string}`,
          block: item.blockNumber,
        },
      ]);
    } catch (error) {
      temporaryStorage.delete(item.transactionHash as `0x${string}`);
      logger.error('[iterateOverPing] Error sending pong', error);
      throw error;
    }
  }
};
