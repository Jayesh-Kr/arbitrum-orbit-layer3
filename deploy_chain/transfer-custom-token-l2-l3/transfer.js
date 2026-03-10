import { createPublicClient, createWalletClient, http, parseEther, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import {config} from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

const PRIVATE_KEY = process.env.SENDER_PRIVATE_KEY
const TOKEN_ADDRESS = process.env.CUSTOM_TOKEN_ADDRESS || '0xf4d293439bCCb7777FE70Df030844a4f5E12e80E';
const INBOX = process.env.INBOX_ADDRESS || '0x51671A6e36bB38438b30A15e1988193A55a751F1';
const AMOUNT = parseEther(process.env.AMOUNT_TO_SEND) || parseEther('1000'); // deposit 1000 HC

const account = privateKeyToAccount(PRIVATE_KEY);

const l2Client = createPublicClient({
  chain: arbitrumSepolia,
  transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
});

const l2Wallet = createWalletClient({
  account,
  chain: arbitrumSepolia,
  transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
});

// Step 1 — Approve inbox to spend HC
const approveTx = await l2Wallet.writeContract({
  address: TOKEN_ADDRESS,
  abi: [{
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount',  type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  }],
  functionName: 'approve',
  args: [INBOX, AMOUNT],
});
console.log('Approved HC spend:', approveTx);
await l2Client.waitForTransactionReceipt({ hash: approveTx });

// Step 2 — Deposit HC into L3 via inbox
const depositTx = await l2Wallet.writeContract({
  address: INBOX,
  abi: [{
    name: 'depositERC20',
    type: 'function',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  }],
  functionName: 'depositERC20',
  args: [AMOUNT],
});
console.log('Deposit TX:', depositTx);
await l2Client.waitForTransactionReceipt({ hash: depositTx });
console.log('Done! Wait ~1 minute for HC to appear on HushConfession.');