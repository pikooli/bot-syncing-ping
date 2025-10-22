// @ts-nocheck
import 'dotenv/config';
import { ethers } from 'ethers';
import { provider, contract, wallet, nonceManager } from '@/lib/ether';
import { iterateOverPing } from '@/services/server.service';
import {
  currentFees,
  sendPong,
  verifyTransaction,
  resumePong,
  haveEnoughtBalance,
  parseHistory,
} from '@/services/web3.service';
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
  // await supabaseDb.storage.insertIntoDbStorageModeQueue([
  //   {
  //     hash: '0x960990a1a5e9b077e678d1af6040d56160eaa1d87580558b1596a5e672dc5f04',
  //     block: 1,
  //   },
  // ]);
  // const data = await supabaseDb.storage.updateDbStorageModeCompleted(
  //   '0x960990a1a5e9b077e678d1af6040d56160eaa1d87580558b1596a5e672dc5f04',
  // );
  // console.log(data);
  // const result = await verifyTransaction(
  //   '0x8dc33130d366512fc05b6d4fb6fa705770481c9c424b9dc052a84e1592316ede',
  // );
  // console.log(result);
  // await resumePong({
  //   txHash:
  //     '0x960990a1a5e9b077e678d1af6040d56160eaa1d87580558b1596a5e672dc5f04',
  //   last_tx_hash:
  //     '0xc1ba65cce01577e70969048a6817e2b79378b07663d2dbfa5e812fae3c1efda1',
  //   attempt: 1,
  // });
  // const result = await haveEnoughtBalance(
  //   ethers.parseUnits('100000.000000000000000000', 'ether'),
  // );
  // console.log(result);
  const h = await parseHistory('Ping', 0, 2);
  console.log(h);
};

test();
