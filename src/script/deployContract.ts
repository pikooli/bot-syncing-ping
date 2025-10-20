import 'dotenv/config';
import { deployContract } from '@/services/web3.service';

const deploy = async () => {
  await deployContract();
};

deploy();
