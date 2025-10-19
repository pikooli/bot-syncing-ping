import 'dotenv/config';
import { deployContract } from '@/lib/ether';

const deploy = async () => {
  await deployContract();
};

deploy();
