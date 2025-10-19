import { EventLog, Log } from 'ethers';
import { contractAbi } from '@/contract';
import { client, getLatestBlockNumber } from '@/lib/viem';
import { parseEventLogs } from 'viem';
import { logger } from '@/lib/logger';
import { contract } from '@/lib/ether';

const HISTORY_STEP = 5;

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
      `Error getting transaction details for txHash ${txHash}`,
      error,
    );
    throw error;
  }
};

export const sendPong = async (txHash: string) => {
  try {
    logger.info('Sending pong', txHash);
    const tx = await contract['pong']?.(txHash);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    logger.error(`Error sending pong for txHash ${txHash}`, error);
    throw error;
  }
};

export const sendPing = async () => {
  try {
    const tx = await contract['ping']?.();
    const receipt = await tx.wait();
    logger.info('Ping sent', receipt);
    return receipt;
  } catch (error) {
    logger.error('Error sending ping', error);
    throw error;
  }
};

export const listenToPing = async (cb: (...args: Array<any>) => void) => {
  await contract['on']?.('Ping', cb);
};

export const intervalPing = async (
  cb: () => Promise<void>,
  interval: number = 1000,
) => {
  logger.info('Starting intervalPing', interval);
  while (true) {
    try {
      await cb();
    } catch (error) {
      logger.error('Error in intervalPing', error);
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
    'Parsing history for event',
    event,
    'starting from block',
    startBlock,
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
        `found ${blockevents.length} events for block ${idx} to ${endLoop}`,
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
      `found ${history.length} events, startBlock: ${startBlock}, endLoop: ${endLoop}`,
    );
    return { history };
  } catch (error) {
    logger.error(
      `Error parsing history for event ${event} starting from block ${startBlock}`,
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
