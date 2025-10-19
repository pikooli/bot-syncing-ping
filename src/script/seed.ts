import 'dotenv/config';
import { deployContract } from '@/lib/ether';

const seed = async () => {
  console.log('going to deploy contract please mine the block');
  const { contract, address } = await deployContract();
  console.log('Contract deployed at address', address);
  console.log('going to send ping please mine the block');
  const tx = await contract['ping']?.();
  const receipt = await tx.wait();
  console.log('Ping sent', receipt);
};

seed();
