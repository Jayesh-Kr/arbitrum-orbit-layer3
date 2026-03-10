import { createPublicClient, http, defineChain } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { createTokenBridgeFetchTokenBridgeContracts } from '@arbitrum/chain-sdk';
import {config} from 'dotenv';

const parentChainPublicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
});

if(!process.env.INBOX_ADDRESS) {
    throw new Error("Inbox address not found in env.. Provide Inbox address");
}

const contracts = await createTokenBridgeFetchTokenBridgeContracts({
  inbox: process.env.INBOX_ADDRESS,
  parentChainPublicClient,
});

console.log('Token Bridge Contracts:', JSON.stringify(contracts, null, 2));