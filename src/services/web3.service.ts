import { EventLog, Log, ethers } from 'ethers';
import { contractAbi } from '@/constants/contract';
import { client, getLatestBlockNumber } from '@/lib/viem';
import { parseEventLogs } from 'viem';
import { logger } from '@/lib/logger';
import { contract, provider, wallet } from '@/lib/ether';
import { bumpFees, sleep } from '@/utils';

const HISTORY_STEP = 5;
const TRANSACTION_TIMEOUT = 15_000;
const MAX_ATTEMPTS = 3;

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

// TODO improve in case a tx is ongoing and timeout, we should wait for the tx to be mined
// and if it is mined, we should return the receipt
// and if it is not mined, we should try again with a bumped fees
export const sendPong = async (txHash: string) => {
  logger.info('[sendPong] Sending pong', txHash);
  let fees = await currentFees();
  const data = contract.interface.encodeFunctionData('pong', [txHash]);
  const contractAddress = await contract.getAddress();
  let nonce = await wallet.getNonce('pending');
  let lastTx: ethers.TransactionResponse | null = null;
  let receipt: ethers.TransactionReceipt | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      logger.info(`[sendPong] attempt ${attempt} sending pong`, txHash);
      const request = {
        to: contractAddress,
        data,
        nonce,
        ...fees,
      };
      console.log('request ==========', request);
      lastTx = await wallet.sendTransaction(request);
      receipt = await provider.waitForTransaction(
        lastTx.hash,
        1,
        TRANSACTION_TIMEOUT,
      );
      if (!receipt || receipt.status === 0) {
        throw new Error('Transaction failed');
      }
      logger.info('[sendPong] pong sent', receipt);
      return receipt;
    } catch (error) {
      logger.error(`[sendPong] Error sending pong for txHash ${txHash}`, error);
      fees = bumpFees(fees);
    }
  }
  return receipt;
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
  interval: number = 10_000,
) => {
  logger.info('[intervalPing] Starting intervalPing', interval);
  while (true) {
    try {
      await cb();
    } catch (error) {
      logger.error('[intervalPing] Error in intervalPing', error);
      throw error;
    }
    await sleep(interval);
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

export const currentFees = async () => {
  const fd = await provider.getFeeData();
  const tip = fd.maxPriorityFeePerGas ?? ethers.parseUnits('2', 'gwei');
  const max = fd.maxFeePerGas ?? tip * 2n;
  return { maxFeePerGas: max, maxPriorityFeePerGas: tip };
};
