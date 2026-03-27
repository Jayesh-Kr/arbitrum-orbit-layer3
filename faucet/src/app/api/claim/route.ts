// src/app/api/claim/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dotenv from 'dotenv';
dotenv.config({ path: process.cwd() + '/.env' });

import { createPublicClient, createWalletClient, Hex, http, isAddress, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

console.log('[FAUCET DEBUG] SENDER_PRIVATE_KEY:', process.env.SENDER_PRIVATE_KEY?.slice(0, 8) + '...');
console.log('[FAUCET DEBUG] CUSTOM_TOKEN_ADDRESS:', process.env.CUSTOM_TOKEN_ADDRESS);
console.log('[FAUCET DEBUG] L3_RPC:', process.env.L3_RPC);

const PRIVATE_KEY = process.env.SENDER_PRIVATE_KEY as Hex;
const L3_RPC = process.env.L3_RPC?.replace(/\/$/, '') || 'http://127.0.0.1:8449';
const MAX_CLAIM_AMOUNT = Number(process.env.MAX_CLAIM_AMOUNT || '20');

const account = privateKeyToAccount(PRIVATE_KEY);

const l3Client = createPublicClient({ transport: http(L3_RPC) });
const l3Wallet = createWalletClient({ account, transport: http(L3_RPC) });

export async function POST(req: NextRequest) {
  try {
    const { address, amount } = await req.json();
    const numericAmount = Number(amount);

    if (!address) return NextResponse.json({ error: 'Wallet address required.' }, { status: 400 });
    if (!isAddress(address))
      return NextResponse.json({ error: 'Valid wallet address required.' }, { status: 400 });
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0)
      return NextResponse.json({ error: 'Valid amount required.' }, { status: 400 });
    if (numericAmount > MAX_CLAIM_AMOUNT)
      return NextResponse.json(
        { error: `Maximum claim is ${MAX_CLAIM_AMOUNT} HUSH per request.` },
        { status: 400 }
      );

    await l3Client.getBlockNumber();

    const parsedAmount = parseEther(numericAmount.toString());
    const balance = await l3Client.getBalance({ address: account.address });
    if (balance < parsedAmount)
      return NextResponse.json({ error: 'Faucet has insufficient balance.' }, { status: 400 });

    // Send transaction
    await l3Wallet.sendTransaction({
      chain: undefined,
      to: address,
      value: parsedAmount,
    });

    // Success
    return NextResponse.json({ success: true, txHash: 'local-node-no-hash' });
  } catch (e: any) {
    console.error('[FAUCET ERROR]', e);
    return NextResponse.json(
      { error: e.message || 'Error processing claim. Is your L3 RPC running?' },
      { status: 500 }
    );
  }
}
