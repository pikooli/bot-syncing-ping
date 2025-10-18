import 'dotenv/config';
import {
  parsePingHistory,
  sendPong,
  listenToPing,
  parsePongHistory,
  getTransactionDetails,
  wallet,
} from '@/lib/ether';
import {
  addToStorage,
  storage,
  findInStorage,
  temporaryStorage,
} from '@/lib/storage';
import { toJsonSafe, batchCall } from '@/utils';

const INITIAL_BLOCK = Number(process.env['START_BLOCK']!);
if (!Number.isFinite(INITIAL_BLOCK)) throw new Error('Invalid START_BLOCK');

export const iterateOverPing = async (initialBlock: number) => {
  const { history, latestBlockNumber } = await parsePingHistory(initialBlock);

  await batchCall(history, async (item) => {
    if (
      findInStorage(item.transactionHash) ||
      temporaryStorage.has(item.transactionHash as `0x${string}`)
    ) {
      return;
    }
    try {
      temporaryStorage.add(item.transactionHash as `0x${string}`);
      await sendPong(item.transactionHash);
      addToStorage(item.transactionHash);
    } catch {
      temporaryStorage.delete(item.transactionHash as `0x${string}`);
      return;
    }
  });

  if (history.length > 0) {
    return { findElement: false, latestBlockNumber };
  }
  return { findElement: true, latestBlockNumber };
};

export const initializeStorage = async () => {
  const { history } = await parsePongHistory(INITIAL_BLOCK);

  const results = await batchCall(history, async (item) => {
    const details = await getTransactionDetails(
      item.transactionHash as `0x${string}`,
    );
    if (!details) {
      return;
    }
    return details;
  });
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
};

const main = async () => {
  console.log(
    '================================ starting server ================================',
  );

  await initializeStorage();
  console.log('storage', storage);

  console.log(
    '================================ starting iterateOverPing ================================',
  );

  let currentBlock = INITIAL_BLOCK;
  while (true) {
    const { findElement, latestBlockNumber } =
      await iterateOverPing(currentBlock);
    currentBlock = latestBlockNumber;
    if (findElement) {
      break;
    }
  }

  console.log('storage', storage);
  console.log(
    '================================ starting listenToPing ================================',
  );
  listenToPing(async () => {
    const { latestBlockNumber } = await iterateOverPing(currentBlock);
    currentBlock = latestBlockNumber;
    console.log('storage', storage);
  });
};

main();
