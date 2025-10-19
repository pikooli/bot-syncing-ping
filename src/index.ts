import 'dotenv/config';
import { EventLog } from 'ethers';
import { TransactionReceipt } from 'viem';
import {
  parsePingHistory,
  sendPong,
  parsePongHistory,
  getTransactionDetails,
  intervalPing,
} from '@/services/web3.service';
import { sendAlert } from '@/services/sendAlert.service';
import {
  addToStorage,
  storage,
  findInStorage,
  temporaryStorage,
} from '@/lib/storage';
import {
  findInDbStorage,
  insertIntoDbStorage,
  addBlockNumber,
  findBlockNumber,
} from '@/lib/supabase';
import { wallet } from '@/lib/ether';
import { BLOCK_NUMBER_USAGE } from '@/constant';
import { logger } from '@/lib/logger';
import { getLatestBlockNumber } from './lib/viem';

const MAX_RETRIES = 10;
const INTERVAL_POOL = 15000;
const BLOCK_STEP = 50;
const INITIAL_BLOCK = Number(process.env['START_BLOCK']!);
if (!Number.isFinite(INITIAL_BLOCK)) throw new Error('Invalid START_BLOCK');

let storageBlock = INITIAL_BLOCK;
let currentBlock = INITIAL_BLOCK;
let retryCount = 0;

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
      logger.error('Error sending pong', error);
      throw error;
    }
  }
};

export const initializeStorage = async () => {
  const dbStorage = await findInDbStorage();
  dbStorage.forEach((item) => {
    addToStorage(item.hash);
  });
  logger.info('storage', storage);

  const latestBlockNumber = await getLatestBlockNumber();
  if (storageBlock >= latestBlockNumber) {
    return;
  }
  let idx = storageBlock;
  let endLoop = idx + BLOCK_STEP;
  try {
    while (true) {
      if (endLoop > latestBlockNumber) {
        endLoop = latestBlockNumber;
      }
      const { history } = await parsePongHistory(idx, endLoop);

      const results: {
        event: EventLog;
        tx: TransactionReceipt;
      }[] = [];
      for (const item of history) {
        const details = await getTransactionDetails(
          item.transactionHash as `0x${string}`,
        );
        if (!details) {
          return;
        }
        results.push(details);
      }

      const validDetails = results.filter((result) => result !== undefined);
      for (const details of validDetails) {
        const { tx, event } = details;
        if (
          event.eventName !== 'Pong' ||
          tx.from.toLowerCase() !== wallet.address.toLowerCase()
        ) {
          continue;
        }
        if (!findInStorage(event.args['txHash'] as `0x${string}`)) {
          addToStorage(event.args['txHash'] as `0x${string}`);
        }
      }

      await insertIntoDbStorage(Array.from(storage));
      idx = endLoop + 1;
      endLoop = idx + BLOCK_STEP;
      storageBlock = idx;
      if (idx >= latestBlockNumber) {
        break;
      }
    }
  } catch (error) {
    storageBlock = idx;
    logger.error('Error initializing storage', error);
    throw error;
  }
};

const main = async () => {
  logger.info(
    '================================ starting server ================================',
  );

  await initializeStorage();

  logger.info('storage', storage);

  logger.info(
    '================================ starting iterateOverPing ================================',
  );

  const latestBlockNumber = await getLatestBlockNumber();
  if (currentBlock < latestBlockNumber) {
    let idx = currentBlock;
    let endLoop = idx + BLOCK_STEP;
    while (true) {
      if (endLoop > latestBlockNumber) {
        endLoop = latestBlockNumber;
      }
      await iterateOverPing(idx, endLoop);
      idx = endLoop + 1;
      endLoop = idx + BLOCK_STEP;
      currentBlock = idx;
      if (idx >= latestBlockNumber) {
        break;
      }
    }
  }

  logger.info('storage', storage);
  logger.info(
    '================================ starting intervalPing ================================',
  );

  await intervalPing(async () => {
    const latestBlockNumber = await getLatestBlockNumber();
    if (currentBlock >= latestBlockNumber) {
      return;
    }
    await iterateOverPing(currentBlock, latestBlockNumber);

    currentBlock = latestBlockNumber;
    logger.info('storage', storage);
    retryCount = 0;
  }, INTERVAL_POOL);
};

const startServer = async () => {
  const pongBlockNumber = await findBlockNumber(BLOCK_NUMBER_USAGE.PONG);
  if (pongBlockNumber.length > 0) {
    storageBlock = Number(pongBlockNumber[0]?.block ?? INITIAL_BLOCK);
  }
  const pingBlockNumber = await findBlockNumber(BLOCK_NUMBER_USAGE.PING);
  if (pingBlockNumber.length > 0) {
    currentBlock = Number(pingBlockNumber[0]?.block ?? INITIAL_BLOCK);
  }

  while (true) {
    try {
      await main();
    } catch (error) {
      logger.error('Error in main, restarting in 5 seconds...', error);
      await addBlockNumber(storageBlock, BLOCK_NUMBER_USAGE.PONG);
      await addBlockNumber(currentBlock, BLOCK_NUMBER_USAGE.PING);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      retryCount++;
      logger.error('retryCount: ', retryCount);
      if (retryCount > MAX_RETRIES) {
        await sendAlert();
        throw new Error('Max retries reached, exiting...');
      }
    }
  }
};

startServer();
