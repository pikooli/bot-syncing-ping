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

export const deployContract = async () => {
  try {
    const contractFactory = new ethers.ContractFactory(
      contractAbi,
      contractBytecode,
      nonceManager,
    );
    const tx = await contractFactory.deploy();
    const result = await tx.waitForDeployment();
    console.log('result', result);
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
