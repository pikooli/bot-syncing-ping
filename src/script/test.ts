import 'dotenv/config';
import { ethers } from 'ethers';
import {
  provider,
  contract,
  wallet,
  nonceManager,
  assertContractOnChain,
} from '@/lib/ether';
import { iterateOverPing } from '@/services/server.service';
import { currentFees, sendPong } from '@/services/web3.service';
import { supabaseDb } from '@/lib/supabase';
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
  // console.log(ethers.parseUnits('2', 'gwei'));
  // const fees = await currentFees();
  // console.log(fees);
  // const result = await sendPong(
  //   '0x498235e43d22a8a154e30304c251f65512832436c544476fc7f9e4b907326afc',
  // );
  // console.log(result);
  // const addr = await wallet.getAddress();
  // const [nLatest, nPending] = await Promise.all([
  //   provider.getTransactionCount(addr, 'latest'),
  //   provider.getTransactionCount(addr, 'pending'),
  // ]);
  // console.log({ nLatest, nPending });
  await supabaseDb.storage.insertIntoDbStorageModeQueue([
    {
      hash: '0x960990a1a5e9b077e678d1af6040d56160eaa1d87580558b1596a5e672dc5f04',
      block: 1,
    },
  ]);
  const data = await supabaseDb.storage.updateDbStorageModeCompleted(
    '0x960990a1a5e9b077e678d1af6040d56160eaa1d87580558b1596a5e672dc5f04',
  );
  console.log(data);
};

test();
