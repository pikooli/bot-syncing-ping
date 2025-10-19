import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

export const client = createPublicClient({
  batch: {
    multicall: true,
  },
  chain: sepolia,
  transport: http(process.env['ALCHEMY_HTTP'] ?? ''),
});

export const getLatestBlockNumber = async () => {
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
  return latestBlockNumber;
};
