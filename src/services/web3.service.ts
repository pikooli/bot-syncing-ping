import { EventLog, Log } from 'ethers';
import { contractAbi } from '@/constants/contract';
import { client, getLatestBlockNumber } from '@/lib/viem';
import { parseEventLogs } from 'viem';
import { logger } from '@/lib/logger';
import { contract, provider } from '@/lib/ether';

const HISTORY_STEP = 5;
const TRANSACTION_TIMEOUT = 10_000;

export const getTransactionDetails = async (txHash: `0x${string}`) => {
  try {
    const tx = await client.getTransactionReceipt({ hash: txHash });
    const eventLogs = await parseEventLogs({
      abi: contractAbi,
      logs: tx.logs,
    });
    if (!eventLogs || eventLogs.length === 0) {
      return null;
    }

    return { event: eventLogs[0] as unknown as EventLog, tx };
  } catch (error) {
    logger.error(
      `[getTransactionDetails] Error getting transaction details for txHash ${txHash}`,
      error,
    );
    throw error;
  }
};

export const sendPong = async (txHash: string) => {
  try {
    logger.info('[sendPong] Sending pong', txHash);
    const tx = await contract['pong']?.(txHash);
    const receipt = await provider.waitForTransaction(
      tx.hash,
      1,
      TRANSACTION_TIMEOUT,
    );
    return receipt;
  } catch (error) {
    logger.error(`[sendPong] Error sending pong for txHash ${txHash}`, error);
    throw error;
  }
};

export const sendPing = async () => {
  try {
    const tx = await contract['ping']?.();
    const receipt = await tx.wait();
    logger.info('[sendPing] Ping sent', receipt);
    return receipt;
  } catch (error) {
    logger.error('[sendPing] Error sending ping', error);
    throw error;
  }
};

export const listenToPing = (cb: (...args: Array<any>) => void) => {
  console.log('[listenToPing] starting to listen to ping');
  return contract['on']?.('Ping', cb);
};

export const intervalPing = async (
  cb: () => Promise<void>,
  interval: number = 1000,
) => {
  logger.info('[intervalPing] Starting intervalPing', interval);
  while (true) {
    try {
      await cb();
    } catch (error) {
      logger.error('[intervalPing] Error in intervalPing', error);
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};

export const parseHistory = async (
  event: string,
  startBlock: number,
  endBlock?: number,
) => {
  logger.info(
    '[parseHistory] Parsing history for event',
    event,
    'starting from block',
    startBlock,
    'to block',
    endBlock,
  );
  const history: (Log | EventLog)[] = [];
  try {
    const latestBlockNumber = await getLatestBlockNumber();
    if (startBlock >= latestBlockNumber) {
      return { history: [] };
    }

    let idx = startBlock;
    let endLoop = idx + HISTORY_STEP;
    while (true) {
      const blockevents = await contract['queryFilter']?.(event, idx, endLoop);
      logger.info(
        `[parseHistory] found ${blockevents.length} events for block ${idx} to ${endLoop}`,
      );
      history.push(...blockevents);
      if (
        idx >= latestBlockNumber ||
        endLoop >= latestBlockNumber ||
        (endBlock && idx >= endBlock)
      ) {
        break;
      }
      idx = endLoop + 1;
      endLoop = idx + HISTORY_STEP;
      if (endBlock && endLoop > endBlock) {
        endLoop = endBlock;
      }
      if (endLoop > latestBlockNumber) {
        endLoop = latestBlockNumber;
      }
    }

    logger.info(
      `[parseHistory] found ${history.length} events, startBlock: ${startBlock}, endLoop: ${endLoop}`,
    );
    return { history };
  } catch (error) {
    logger.error(
      `[parseHistory] Error parsing history for event ${event} starting from block ${startBlock}`,
      error,
    );
    throw error;
  }
};

export const parsePongHistory = async (
  startBlock: number,
  endBlock?: number,
) => {
  return await parseHistory('Pong', startBlock, endBlock);
};

export const parsePingHistory = async (
  startBlock: number,
  endBlock?: number,
) => {
  return await parseHistory('Ping', startBlock, endBlock);
};
