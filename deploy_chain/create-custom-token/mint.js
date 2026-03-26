import { config } from 'dotenv';
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';

config();

const PRIVATE_KEY = process.env.SENDER_PRIVATE_KEY;
const TOKEN_ADDRESS = process.env.CUSTOM_TOKEN_ADDRESS;

if (!PRIVATE_KEY || !TOKEN_ADDRESS) {
  throw new Error('Please set SENDER_PRIVATE_KEY and CUSTOM_TOKEN_ADDRESS in your .env');
}

const account = privateKeyToAccount(PRIVATE_KEY);

const wallet = createWalletClient({
  account,
  chain: arbitrumSepolia,
  transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
});

const mintAbi = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
];

async function mintTokens(to, amount) {
  try {
    const amountInWei = parseEther(amount.toString());

    console.log(`Sending mint of ${amount} tokens to ${to}...`);

    const txHash = await wallet.writeContract({
      address: TOKEN_ADDRESS,
      abi: mintAbi,
      functionName: 'mint',
      args: [to, amountInWei],
    });

    console.log('Transaction sent. Hash:', txHash);

    const receipt = await wallet.waitForTransaction(txHash);
    console.log('Transaction mined in block:', receipt.blockNumber);
    console.log('Mint successful!');
  } catch (err) {
    console.error('Mint failed:', err);
  }
}

// Usage: node mint.js <toAddress> <amount>
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , to, amount] = process.argv;
  if (!to || !amount) {
    console.error('Usage: node mint.js <toAddress> <amount>');
    process.exit(1);
  }

  mintTokens(to, amount).catch(console.error);
}
