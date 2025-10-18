import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

export const client = createPublicClient({
  batch: {
    multicall: true,
  },
  chain: sepolia,
  transport: http(process.env['ALCHEMY_HTTP'] ?? ''),
});
