import 'dotenv/config';
import { sendPong } from '@/services/web3.service';
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
          `[botPong] Sending pong for hash: ${item.hash} block: ${item.block}`,
        );
        await sendPong(item.hash);
        await supabaseDb.storage.updateDbStorageModeCompleted(item.hash);
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
