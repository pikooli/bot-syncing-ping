import 'dotenv/config';
import { sendPong, resumePong } from '@/services/web3.service';
import { supabaseDb } from '@/lib/supabase';
import { sendAlert } from '@/services/sendAlert.service';
import { logger } from '@/lib/logger';
import { sleep } from '@/utils';

const INTERVAL_BOT_PONG = 15_000;
const MAX_ATTEMPTS = 3;

const botPong = async () => {
  logger.info(
    '================================ starting botPong ================================',
  );
  let retryCount = 0;
  while (true) {
    try {
      const dbStorage = await supabaseDb.storage.findInDbStorageFirstQueue();
      if (dbStorage.length === 0) {
        await sleep(INTERVAL_BOT_PONG);
        continue;
      }
      for (let idx = 0; idx < dbStorage.length; ) {
        const item = dbStorage[idx];
        if (!item) {
          idx++;
          continue;
        }

        logger.info(
          `[botPong] found item in queue for hash: ${item.hash} block: ${item.block} attempt: ${item.attempt}`,
        );
        let result = null;
        if (item.last_tx_hash && !item.done) {
          result = await resumePong({
            txHash: item.hash,
            last_tx_hash: item.last_tx_hash,
            attempt: item.attempt!,
          });
        } else {
          result = await sendPong(item.hash);
        }
        if (!result) {
          throw new Error('Transaction failed');
        }
        const { nonce, lastTx, attempt, done } = result;
        if (!done) {
          logger.info(
            '[botPong] Transaction not completed for hash',
            item.hash,
          );
          await supabaseDb.storage.updateDbStorage({
            hash: item.hash,
            attempt: attempt,
            nonce: nonce,
            last_tx_hash: lastTx?.hash as `0x${string}`,
          });
          throw new Error('Transaction failed');
        }
        logger.info('[botPong] Transaction completed for hash', item.hash);
        await supabaseDb.storage.updateDbStorageModeCompleted({
          hash: item.hash,
          nonce: nonce,
          attempt: attempt,
          last_tx_hash: lastTx?.hash ?? '',
        });
        idx++;
        retryCount = 0;
      }
    } catch (error) {
      logger.error('[botPong] Error sending pong', error);
      await sleep(INTERVAL_BOT_PONG);
      retryCount++;
      if (retryCount > MAX_ATTEMPTS) {
        logger.error('[botPong] Max attempts reached, throwing error');
        await sendAlert();
        throw error;
      }
    }
  }
};

botPong();
