import { ethers, ContractEventPayload, EventLog, Log } from 'ethers';
import { contractBytecode, contractAbi } from '@/contract';
import { client } from '@/lib/viem';
import { parseEventLogs } from 'viem';

const HISTORY_STEP = 5;

export const wallet = new ethers.Wallet(
  process.env['PRIVATE_KEY'] ?? '',
  new ethers.JsonRpcProvider(process.env['ALCHEMY_HTTP'] ?? ''),
);

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
    console.error(
      `Error getting transaction details for txHash ${txHash}`,
      error,
    );
    throw error;
  }
};

export const contract = new ethers.Contract(
  process.env['CONTRACT_ADDRESS'] ?? '',
  contractAbi,
  wallet,
);

export const deployContract = async () => {
  try {
    const contractFactory = new ethers.ContractFactory(
      contractAbi,
      contractBytecode,
      wallet,
    );
    const tx = await contractFactory.deploy();
    const result = await tx.waitForDeployment();
    const address = await result.getAddress();
    const contract = await new ethers.Contract(address, contractAbi, wallet);
    console.log(`Contract deployed at address ${address}`, contract);
    return contract;
  } catch (error) {
    console.error('Error deploying contract', error);
    throw error;
  }
};

export const sendPong = async (txHash: string) => {
  try {
    console.log('Sending pong', txHash);
    const tx = await contract['pong']?.(txHash);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error(`Error sending pong for txHash ${txHash}`, error);
    throw error;
  }
};

export const sendPing = async () => {
  try {
    const tx = await contract['ping']?.();
    const receipt = await tx.wait();
    console.log('Ping sent', receipt);
    return receipt;
  } catch (error) {
    console.error('Error sending ping', error);
    throw error;
  }
};

export const listenToPing = async (cb: (...args: Array<any>) => void) => {
  await contract['on']?.('Ping', cb);
};

export const parseHistory = async (event: string, startBlock: number) => {
  console.log(
    'Parsing history for event',
    event,
    'starting from block',
    startBlock,
  );
  const history: (Log | EventLog)[] = [];
  try {
    const latestBlock = await client.getBlock({
      blockTag: 'latest',
    });
    if (!latestBlock) {
      throw new Error('Latest block not found');
    }
    const latestBlockNumber = Number(latestBlock.number);
    if (!latestBlockNumber) {
      throw new Error('Latest block number not found');
    }
    if (startBlock >= latestBlockNumber) {
      return { history: [], latestBlockNumber };
    }

    let i = startBlock;
    let endLoop = i + HISTORY_STEP;
    while (true) {
      endLoop = i + HISTORY_STEP;
      if (endLoop > latestBlockNumber) {
        endLoop = latestBlockNumber;
      }
      const blockevents = await contract['queryFilter']?.(event, i, endLoop);
      console.log(
        `found ${blockevents.length} events for block ${i} to ${endLoop}`,
      );
      history.push(...blockevents);
      if (i >= latestBlockNumber || endLoop >= latestBlockNumber) {
        break;
      }
      i = endLoop + 1;
    }

    console.log(
      `found ${history.length} events, latestBlockNumber`,
      latestBlockNumber,
    );
    return { history, latestBlockNumber };
  } catch (error) {
    console.error(
      `Error parsing history for event ${event} starting from block ${startBlock}`,
      error,
    );
    throw error;
  }
};

export const parsePongHistory = async (startBlock: number) => {
  return await parseHistory('Pong', startBlock);
};

export const parsePingHistory = async (startBlock: number) => {
  return await parseHistory('Ping', startBlock);
};
