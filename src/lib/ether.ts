import { ethers, NonceManager } from 'ethers';
import { contractBytecode, contractAbi } from '@/constants/contract';
import { logger } from '@/lib/logger';

export const provider = new ethers.JsonRpcProvider(
  process.env['RCP_HTTP'] ?? '',
);

export const wallet = new ethers.Wallet(
  process.env['PRIVATE_KEY'] ?? '',
  provider,
);

export const nonceManager = new NonceManager(wallet);

export const contract = new ethers.Contract(
  process.env['CONTRACT_ADDRESS'] ?? '',
  contractAbi,
  nonceManager,
);
