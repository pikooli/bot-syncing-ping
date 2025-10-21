import 'dotenv/config';
import { EventLog, ContractEventPayload } from 'ethers';
import { TransactionReceipt, Transaction } from 'viem';
import {
  parsePongHistory,
  getTransactionDetails,
  intervalPing,
  listenToPing,
} from '@/services/web3.service';
import { sendAlert } from '@/services/sendAlert.service';
import { addToStorage, storage, findInStorage } from '@/lib/storage';
import { supabaseDb } from '@/lib/supabase';
import { wallet } from '@/lib/ether';
import { BLOCK_NUMBER_USAGE } from '@/constants';
import { logger } from '@/lib/logger';
import { getLatestBlockNumber } from '@/lib/viem';
import { iterateOverPing } from '@/services/server.service';
import { sleep } from '@/utils';

const MAX_RETRIES = 10;
const INTERVAL_POOL = 15_000;
const RETRY_INTERVAL = 5_000;
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
  await supabaseDb.blockNumber.addBlockNumber(
    event.log.blockNumber,
    BLOCK_NUMBER_USAGE.PING,
  );
  currentBlock = event.log.blockNumber;
  logger.info('[main] storage', storage);
};

export const initializeStorage = async (search: { block?: number }) => {
  logger.info(
    '[initializeStorage] starting initializeStorage starting at block: ',
    search.block,
  );
  const dbStorage = await supabaseDb.storage.findInDbStorage(search);
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
        tx: Transaction;
        receipt: TransactionReceipt;
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

      for (const details of results) {
        const { tx, event, receipt } = details;
        if (
          event.eventName !== 'Pong' ||
          receipt.from.toLowerCase() !== wallet.address.toLowerCase()
        ) {
          continue;
        }
        const txHash = event.args['txHash'] as `0x${string}`;

        if (!findInStorage(txHash)) {
          addToStorage(txHash);
          await supabaseDb.storage.insertIntoDbStorageModeDone([
            {
              hash: txHash,
              block: Number(event.blockNumber),
              nonce: tx.nonce,
              attempt: 0,
              last_tx_hash: event.transactionHash,
            },
          ]);
        }
      }
      await supabaseDb.blockNumber.addBlockNumber(
        endLoop,
        BLOCK_NUMBER_USAGE.PONG,
      );
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
  await initializeStorage({ block: storageBlock });

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
      await supabaseDb.blockNumber.addBlockNumber(
        endLoop,
        BLOCK_NUMBER_USAGE.PING,
      );
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
      '[intervalPing] intervalPing currentBlock: ',
      currentBlock,
      '=> latestBlockNumber: ',
      latestBlockNumber,
    );
    if (currentBlock >= latestBlockNumber) {
      return;
    }
    await iterateOverPing(currentBlock, latestBlockNumber);
    await supabaseDb.blockNumber.addBlockNumber(
      latestBlockNumber,
      BLOCK_NUMBER_USAGE.PING,
    );
    currentBlock = latestBlockNumber;
    logger.info('[intervalPing] storage', storage);
    retryCount = 0;
  }, INTERVAL_POOL);
};

const botPing = async () => {
  logger.info(
    '================================ starting botPing ================================',
  );
  const pongBlockNumber = await supabaseDb.blockNumber.findBlockNumber(
    BLOCK_NUMBER_USAGE.PONG,
  );
  if (pongBlockNumber.length > 0) {
    storageBlock = Number(pongBlockNumber[0]?.block ?? INITIAL_BLOCK);
  }
  const pingBlockNumber = await supabaseDb.blockNumber.findBlockNumber(
    BLOCK_NUMBER_USAGE.PING,
  );
  if (pingBlockNumber.length > 0) {
    currentBlock = Number(pingBlockNumber[0]?.block ?? INITIAL_BLOCK);
  }

  while (true) {
    try {
      await main();
    } catch (error) {
      logger.error(
        '[botPing] Error in main, restarting in 5 seconds...',
        error,
      );
      await supabaseDb.blockNumber.addBlockNumber(
        storageBlock,
        BLOCK_NUMBER_USAGE.PONG,
      );
      await supabaseDb.blockNumber.addBlockNumber(
        currentBlock,
        BLOCK_NUMBER_USAGE.PING,
      );
      await sleep(RETRY_INTERVAL);
      retryCount++;
      logger.error('[botPing] retryCount: ', retryCount);
      if (retryCount > MAX_RETRIES) {
        await sendAlert();
        throw new Error('[botPing] Max retries reached, exiting...');
      }
    }
  }
};

botPing();
