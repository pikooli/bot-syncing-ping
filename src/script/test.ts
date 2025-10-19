import 'dotenv/config';
import {
  provider,
  contract,
  wallet,
  nonceManager,
  assertContractOnChain,
} from '@/lib/ether';
import { iterateOverPing } from '@/services/server.service';

const test = async () => {
  // const feeData = await provider.getFeeData();
  // console.log(feeData);
  //
  //   const blockevents = await contract['queryFilter']?.('Ping', 0, 100);
  //   console.log(blockevents);
  //
  //   const data = contract.interface.encodeFunctionData('pong', [
  //     '0x498235e43d22a8a154e30304c251f65512832436c544476fc7f9e4b907326afc',
  //   ]);
  //   console.log(data);
  //
  //   let nonce = await wallet.getNonce('pending');
  //   console.log(`wallet nonce: ${nonce}`);
  //
  //   nonce = await nonceManager.getNonce('pending');
  //   console.log(`nonceManager nonce: ${nonce}`);
  //
  // const result = await iterateOverPing(0, 100);
  // console.log(result);
  // assertContractOnChain();
};

test();
