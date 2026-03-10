import { createPublicClient, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });
import {
  prepareChainConfig,
  createRollupPrepareDeploymentParamsConfig,
  createRollup,
  prepareNodeConfig,
} from '@arbitrum/chain-sdk';
import { sanitizePrivateKey, generateChainId } from '@arbitrum/chain-sdk/utils';
import * as fs from 'fs';

function withFallbackPrivateKey(privateKey) {
  if (typeof privateKey === 'undefined' || privateKey === '') {
    return generatePrivateKey();
  }
  return sanitizePrivateKey(privateKey);
}

if (typeof process.env.DEPLOYER_PRIVATE_KEY === 'undefined') {
  throw new Error(`Please provide the "DEPLOYER_PRIVATE_KEY" environment variable`);
}
if (typeof process.env.CUSTOM_FEE_TOKEN_ADDRESS === 'undefined') {
  throw new Error(`Please provide the "CUSTOM_FEE_TOKEN_ADDRESS" environment variable`);
}
if (typeof process.env.PARENT_CHAIN_RPC === 'undefined' || process.env.PARENT_CHAIN_RPC === '') {
  console.warn(`Warning: you may encounter timeout errors. Please provide PARENT_CHAIN_RPC.`);
}

// load or generate a random batch poster account
const batchPosterPrivateKey = withFallbackPrivateKey(process.env.BATCH_POSTER_PRIVATE_KEY);
const batchPoster = privateKeyToAccount(batchPosterPrivateKey).address;

// load or generate a random validator account
const validatorPrivateKey = withFallbackPrivateKey(process.env.VALIDATOR_PRIVATE_KEY);
const validator = privateKeyToAccount(validatorPrivateKey).address;

// set the parent chain and create a public client for it
const parentChain = arbitrumSepolia;
const parentChainPublicClient = createPublicClient({
  chain: parentChain,
  transport: http(process.env.PARENT_CHAIN_RPC),
});

// load the deployer account
const deployer = privateKeyToAccount(sanitizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY));

async function main() {
  const chainName = process.env.CHAIN_NAME ?? 'HushConfession';
  const minL2BaseFee = Number(process.env.MIN_L2_BASE_FEE ?? 100000000);

  // generate a random chain id
  const chainId = generateChainId();
  console.log(`Using Chain ID: ${chainId}`);

  // set the custom fee token
  const nativeToken = process.env.CUSTOM_FEE_TOKEN_ADDRESS;

  const chainConfig = prepareChainConfig({
    chainId,
    arbitrum: {
      InitialChainOwner: deployer.address,
      DataAvailabilityCommittee: true,
    },
  });

  const createRollupConfig = createRollupPrepareDeploymentParamsConfig(parentChainPublicClient, {
    chainId: BigInt(chainId),
    owner: deployer.address,
    chainConfig,
  });

  try {
    // ✅ NOW we capture the result
    const result = await createRollup({
      params: {
        config: createRollupConfig,
        batchPosters: [batchPoster],
        validators: [validator],
        nativeToken,
      },
      account: deployer,
      parentChainPublicClient,
    });

    // ✅ Print all deployed contract addresses
    console.log('\n=== DEPLOYMENT SUCCESSFUL ===');
    console.log('Core Contracts:', result.coreContracts);
    console.log('Batch Poster Address:', batchPoster);
    console.log('Batch Poster Private Key:', batchPosterPrivateKey);
    console.log('Validator Address:', validator);
    console.log('Validator Private Key:', validatorPrivateKey);
    console.log('Chain ID:', chainId);

    // ✅ Generate node config
    const nodeConfig = prepareNodeConfig({
      chainName,
      chainConfig,
      coreContracts: result.coreContracts,
      batchPosterPrivateKey,
      validatorPrivateKey,
      stakeToken: nativeToken,
      parentChainRpcUrl: process.env.PARENT_CHAIN_RPC ?? 'https://sepolia-rollup.arbitrum.io/rpc',
      parentChainId: parentChain.id,
    });

    // ✅ Save nodeConfig.json
    fs.writeFileSync('./nodeConfig.json', JSON.stringify(nodeConfig, null, 2));
    console.log('\n✅ nodeConfig.json saved!');

    // ✅ Save orbitSetupConfig.json (contract addresses)
    const orbitSetupConfig = {
      chainId,
      parentChainId: parentChain.id,
      chainOwner: deployer.address,
      batchPoster,
      staker: validator,
      minL2BaseFee,
      chainName,
      networkFeeReceiver: deployer.address,
      infrastructureFeeCollector: deployer.address,
      ...result.coreContracts,
      nativeToken,
    };
    fs.writeFileSync('./orbitSetupScriptConfig.json', JSON.stringify(orbitSetupConfig, null, 2));
    console.log('✅ orbitSetupScriptConfig.json saved!');

    console.log('\n=== NEXT STEP ===');
    console.log('Copy nodeConfig.json and orbitSetupConfig.json to your orbit-setup-script/config/ folder');

  } catch (error) {
    console.error(`Rollup creation failed with error: ${error}`);
  }
}

main();
