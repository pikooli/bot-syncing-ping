import 'dotenv/config';
import { EventLog, ContractEventPayload } from 'ethers';
import { TransactionReceipt } from 'viem';
import {
  parsePongHistory,
  getTransactionDetails,
  intervalPing,
  listenToPing,
} from '@/services/web3.service';
import { sendAlert } from '@/services/sendAlert.service';
import { addToStorage, storage, findInStorage } from '@/lib/storage';
import {
  findInDbStorage,
  insertIntoDbStorage,
  addBlockNumber,
  findBlockNumber,
} from '@/lib/supabase';
import { wallet } from '@/lib/ether';
import { BLOCK_NUMBER_USAGE } from '@/constants';
import { logger } from '@/lib/logger';
import { getLatestBlockNumber } from '@/lib/viem';
import { iterateOverPing } from '@/services/server.service';

const MAX_RETRIES = 10;
const INTERVAL_POOL = 15000;
const RETRY_INTERVAL = 5000;
const BLOCK_STEP = 50;
const INITIAL_BLOCK = Number(process.env['START_BLOCK']!);
if (!Number.isFinite(INITIAL_BLOCK)) throw new Error('Invalid START_BLOCK');

let storageBlock = INITIAL_BLOCK;
let currentBlock = INITIAL_BLOCK;
let retryCount = 0;

const handleListenToPing = async (event: ContractEventPayload) => {
  logger.info(
    '[handleListenToPing] Ping received hash: ',
    event.log.transactionHash,
    'blockNumber: ',
    event.log.blockNumber,
  );
  await iterateOverPing(currentBlock, event.log.blockNumber);
  await addBlockNumber(event.log.blockNumber, BLOCK_NUMBER_USAGE.PING);
  currentBlock = event.log.blockNumber;
  logger.info('[main] storage', storage);
};

export const initializeStorage = async () => {
  logger.info('[initializeStorage] starting initializeStorage');
  const dbStorage = await findInDbStorage();
  dbStorage.forEach((item) => {
    addToStorage(item.hash);
  });
  logger.info('[initializeStorage] storage', storage);

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
        const txHash = event.args['txHash'] as `0x${string}`;
        if (!findInStorage(txHash)) {
          addToStorage(txHash);
          await insertIntoDbStorage([txHash]);
        }
      }
      await addBlockNumber(endLoop, BLOCK_NUMBER_USAGE.PONG);
      idx = endLoop + 1;
      endLoop = idx + BLOCK_STEP;
      storageBlock = idx;
      if (idx >= latestBlockNumber) {
        break;
      }
    }
  } catch (error) {
    storageBlock = idx;
    logger.error('[initializeStorage] Error initializing storage', error);
    throw error;
  }
};

const main = async () => {
  logger.info('[main] starting main ');
  await initializeStorage();

  logger.info('[main] storage', storage);

  logger.info('[main] starting iterateOverPing');

  const latestBlockNumber = await getLatestBlockNumber();
  if (currentBlock < latestBlockNumber) {
    let idx = currentBlock;
    let endLoop = idx + BLOCK_STEP;
    while (true) {
      if (endLoop > latestBlockNumber) {
        endLoop = latestBlockNumber;
      }
      await iterateOverPing(idx, endLoop);
      await addBlockNumber(endLoop, BLOCK_NUMBER_USAGE.PING);
      idx = endLoop + 1;
      endLoop = idx + BLOCK_STEP;
      currentBlock = idx;
      if (idx >= latestBlockNumber) {
        break;
      }
    }
  }

  logger.info('[main] storage', storage);

  await listenToPing(handleListenToPing);

  logger.info('[main] starting intervalPing');

  await intervalPing(async () => {
    const latestBlockNumber = await getLatestBlockNumber();
    logger.info(
      '[main] intervalPing currentBlock: ',
      currentBlock,
      '=> latestBlockNumber: ',
      latestBlockNumber,
    );
    if (currentBlock >= latestBlockNumber) {
      return;
    }
    await iterateOverPing(currentBlock, latestBlockNumber);
    await addBlockNumber(latestBlockNumber, BLOCK_NUMBER_USAGE.PING);
    currentBlock = latestBlockNumber;
    logger.info('[main] storage', storage);
    retryCount = 0;
  }, INTERVAL_POOL);
};

const startServer = async () => {
  logger.info(
    '================================ starting server ================================',
  );
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
      logger.error(
        '[startServer] Error in main, restarting in 5 seconds...',
        error,
      );
      await addBlockNumber(storageBlock, BLOCK_NUMBER_USAGE.PONG);
      await addBlockNumber(currentBlock, BLOCK_NUMBER_USAGE.PING);
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      retryCount++;
      logger.error('[startServer] retryCount: ', retryCount);
      if (retryCount > MAX_RETRIES) {
        await sendAlert();
        throw new Error('[startServer] Max retries reached, exiting...');
      }
    }
  }
};

startServer();
