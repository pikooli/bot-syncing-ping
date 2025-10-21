import { EventLog, Log, ethers } from 'ethers';
import { contractAbi, contractBytecode } from '@/constants/contract';
import { client, getLatestBlockNumber } from '@/lib/viem';
import { parseEventLogs } from 'viem';
import { logger } from '@/lib/logger';
import { contract, nonceManager, provider, wallet } from '@/lib/ether';
import { bumpFees, sleep, toJsonSafe } from '@/utils';
import { supabaseDb } from '@/lib/supabase';

const HISTORY_STEP = 5;
const TRANSACTION_TIMEOUT = 15_000;
const MAX_ATTEMPTS = 3;
const GAS_LIMIT = 150_000n;

export const getTransactionDetails = async (txHash: `0x${string}`) => {
  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    const tx = await client.getTransaction({ hash: txHash });
    const eventLogs = await parseEventLogs({
      abi: contractAbi,
      logs: receipt.logs,
    });
    if (!eventLogs || eventLogs.length === 0) {
      return null;
    }

    return { event: eventLogs[0] as unknown as EventLog, tx, receipt };
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
export const sendPong = async (
  txHash: `0x${string}`,
  oldTx?: Awaited<ReturnType<typeof client.getTransaction>>,
) => {
  logger.info('[sendPong] Sending pong', txHash);
  let fees = await currentFees();
  const data = contract.interface.encodeFunctionData('pong', [txHash]);
  const contractAddress = await contract.getAddress();
  let nonce = await wallet.getNonce('pending');
  let lastTx: ethers.TransactionResponse | null = null;
  let receipt: ethers.TransactionReceipt | null = null;
  if (oldTx) {
    fees = {
      maxFeePerGas: oldTx.maxFeePerGas as bigint,
      maxPriorityFeePerGas: oldTx.maxPriorityFeePerGas as bigint,
    };
    nonce = oldTx.nonce;
  }
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      logger.info(`[sendPong] attempt ${attempt} sending pong`, txHash);

      if (lastTx) {
        const { tx } = await verifyTransaction(lastTx?.hash as `0x${string}`);
        if (tx.blockNumber) {
          return { receipt, nonce, lastTx, attempt, done: true };
        }
      }
      const request: ethers.TransactionRequest = {
        to: contractAddress,
        data,
        nonce,
        ...fees,
      };
      if (
        !(await haveEnoughtBalance({
          gasLimit: GAS_LIMIT,
          maxFeePerGas: fees.maxFeePerGas,
        }))
      ) {
        throw new Error('Not enough balance');
      }
      if (oldTx || attempt > 1) {
        request.gasLimit = GAS_LIMIT;
      }
      lastTx = await wallet.sendTransaction(request);
      logger.info('[sendPong] new lastTx hash', lastTx.hash);
      await supabaseDb.storage.updateDbStorage({
        hash: txHash,
        nonce: nonce,
        last_tx_hash: lastTx.hash as `0x${string}`,
      });
      receipt = await provider.waitForTransaction(
        lastTx.hash,
        1,
        TRANSACTION_TIMEOUT,
      );
      if (!receipt || receipt.status === 0 || !receipt.blockNumber) {
        throw new Error('Transaction failed');
      }
      logger.info('[sendPong] pong sent for txHash', txHash);
      if (receipt.blockNumber) {
        return { receipt, nonce, lastTx, attempt, done: true };
      }
    } catch (error) {
      logger.error(`[sendPong] Error sending pong for txHash ${txHash}`, error);
      fees = bumpFees(fees);
    }
  }
  return { receipt, nonce, lastTx, attempt: MAX_ATTEMPTS, done: false };
};

export const resumePong = async ({
  txHash,
  last_tx_hash,
  attempt,
}: {
  txHash: `0x${string}`;
  last_tx_hash: `0x${string}`;
  attempt: number;
}) => {
  logger.info(
    '[resumePong] Resuming pong',
    'txHash: ',
    txHash,
    'last_tx_hash: ',
    last_tx_hash,
    'attempt: ',
    attempt,
  );
  const { tx, receipt } = await verifyTransaction(last_tx_hash);
  if (receipt && receipt.status === 'success' && tx.blockNumber) {
    return {
      nonce: tx.nonce,
      lastTx: tx,
      attempt: MAX_ATTEMPTS,
      done: true,
    };
  }
  const newFees = bumpFees({
    maxFeePerGas: tx.maxFeePerGas as bigint,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas as bigint,
  });
  tx.maxFeePerGas = newFees.maxFeePerGas;
  tx.maxPriorityFeePerGas = newFees.maxPriorityFeePerGas;
  const resuls = await sendPong(txHash, tx);
  if (!resuls.done) {
    throw new Error('[resumePong] Transaction failed');
  }
  return { ...resuls, attempt: resuls.attempt + attempt };
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
  logger.info('[listenToPing] starting to listen to ping');
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
    if (startBlock > latestBlockNumber) {
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

export const assertContractOnChain = async () => {
  const address = await contract.getAddress();
  logger.info('[assertContractOnChain] address', address);
  const code = await provider.getCode(address);
  logger.info('[assertContractOnChain] code', code);
  if (code === '0x') {
    throw new Error('[assertContractOnChain] Contract not deployed');
  }
  return true;
};

export const deployContract = async () => {
  try {
    const contractFactory = new ethers.ContractFactory(
      contractAbi,
      contractBytecode,
      nonceManager,
    );
    const tx = await contractFactory.deploy();
    const result = await tx.waitForDeployment();
    const address = await result.getAddress();
    const contract = new ethers.Contract(address, contractAbi, nonceManager);
    logger.info(
      `[deployContract] Contract deployed at address ${address}`,
      contract,
    );
    return { contract, address };
  } catch (error) {
    logger.error('[deployContract] Error deploying contract', error);
    throw error;
  }
};

export const verifyTransaction = async (txHash: `0x${string}`) => {
  const tx = await client.getTransaction({ hash: txHash });
  if (!tx) {
    throw new Error('[verifyTransaction] Transaction not found');
  }
  if (tx.blockNumber) {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    return { tx, receipt };
  }
  return { tx, receipt: null };
};

export const haveEnoughtBalance = async ({
  value = ethers.parseUnits('0', 'ether'),
  gasLimit,
  maxFeePerGas,
}: {
  value?: bigint;
  gasLimit: bigint;
  maxFeePerGas: bigint;
}) => {
  const balance = await client.getBalance({
    address: (await wallet.getAddress()) as `0x${string}`,
  });
  if (balance < value + gasLimit * maxFeePerGas) {
    return false;
  }
  return true;
};
