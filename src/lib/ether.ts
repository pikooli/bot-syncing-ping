import { ethers } from 'ethers';
import { contractBytecode, contractAbi } from '@/contract';
import { logger } from '@/lib/logger';

export const wallet = new ethers.Wallet(
  process.env['PRIVATE_KEY'] ?? '',
  new ethers.JsonRpcProvider(process.env['ALCHEMY_HTTP'] ?? ''),
);

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
    logger.info(`Contract deployed at address ${address}`, contract);
    return contract;
  } catch (error) {
    logger.error('Error deploying contract', error);
    throw error;
  }
};
