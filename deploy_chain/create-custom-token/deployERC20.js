import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import solc from 'solc';
import { config } from 'dotenv';
import { sanitizePrivateKey } from '@arbitrum/chain-sdk/utils';
import { createPublicClient, createWalletClient, getContractAddress, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

config({ path: path.resolve(workspaceRoot, '.env') });
config({ path: path.resolve(__dirname, '.env'), override: true });

const CONTRACT_FILE_NAME = 'createERC20.sol';
const CONTRACT_NAME = 'CustomERC20';
const DEFAULT_INITIAL_SUPPLY = '1000000';

function requireEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Please provide the "${name}" environment variable.`);
	}
	return value;
}

function resolveImport(importPath) {
	const localImportPath = path.resolve(workspaceRoot, importPath);
	if (fs.existsSync(localImportPath)) {
		return { contents: fs.readFileSync(localImportPath, 'utf8') };
	}

	const nodeModulesImportPath = path.resolve(workspaceRoot, 'node_modules', importPath);
	if (fs.existsSync(nodeModulesImportPath)) {
		return { contents: fs.readFileSync(nodeModulesImportPath, 'utf8') };
	}

	return { error: `File not found: ${importPath}` };
}

function compileContract() {
	const contractPath = path.resolve(__dirname, CONTRACT_FILE_NAME);
	const source = fs.readFileSync(contractPath, 'utf8');

	const input = {
		language: 'Solidity',
		sources: {
			[CONTRACT_FILE_NAME]: {
				content: source,
			},
		},
		settings: {
			optimizer: {
				enabled: true,
				runs: 200,
			},
			outputSelection: {
				'*': {
					'*': ['abi', 'evm.bytecode.object'],
				},
			},
		},
	};

	const output = JSON.parse(solc.compile(JSON.stringify(input), { import: resolveImport }));

	if (output.errors?.length) {
		const errors = output.errors.filter((entry) => entry.severity === 'error');
		if (errors.length > 0) {
			throw new Error(errors.map((entry) => entry.formattedMessage).join('\n'));
		}
	}

	const contract = output.contracts?.[CONTRACT_FILE_NAME]?.[CONTRACT_NAME];
	if (!contract?.abi || !contract?.evm?.bytecode?.object) {
		throw new Error(`Unable to compile ${CONTRACT_NAME}.`);
	}

	return {
		abi: contract.abi,
		bytecode: `0x${contract.evm.bytecode.object}`,
	};
}

async function main() {
	const deployerPrivateKey = sanitizePrivateKey(requireEnv('DEPLOYER_PRIVATE_KEY'));
	const tokenName = requireEnv('TOKEN_NAME');
	const tokenSymbol = requireEnv('TOKEN_SYMBOL');
	const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL ?? arbitrumSepolia.rpcUrls.default.http[0];

	const account = privateKeyToAccount(deployerPrivateKey);
	const publicClient = createPublicClient({
		chain: arbitrumSepolia,
		transport: http(rpcUrl),
	});
	const walletClient = createWalletClient({
		account,
		chain: arbitrumSepolia,
		transport: http(rpcUrl),
	});

	const { abi, bytecode } = compileContract();
	const constructorArgs = [tokenName, tokenSymbol];

	console.log(`Deploying ${tokenName} (${tokenSymbol}) to Arbitrum Sepolia...`);

	const nonce = await publicClient.getTransactionCount({
		address: account.address,
		blockTag: 'pending',
	});

	const hash = await walletClient.deployContract({
		abi,
		bytecode,
		args: constructorArgs,
		account,
		chain: arbitrumSepolia,
	});

	const receipt = await publicClient.waitForTransactionReceipt({ hash });
	const contractAddress = receipt.contractAddress ?? getContractAddress({
		from: account.address,
		nonce,
	});

	const tokenContract = parseAbi([
		'function name() view returns (string)',
		'function symbol() view returns (string)',
		'function decimals() view returns (uint8)',
		'function totalSupply() view returns (uint256)',
		'function owner() view returns (address)',
	]);

	const [deployedName, deployedSymbol, decimals, totalSupply, owner] = await Promise.all([
		publicClient.readContract({ address: contractAddress, abi: tokenContract, functionName: 'name' }),
		publicClient.readContract({ address: contractAddress, abi: tokenContract, functionName: 'symbol' }),
		publicClient.readContract({ address: contractAddress, abi: tokenContract, functionName: 'decimals' }),
		publicClient.readContract({ address: contractAddress, abi: tokenContract, functionName: 'totalSupply' }),
		publicClient.readContract({ address: contractAddress, abi: tokenContract, functionName: 'owner' }),
	]);

	const deploymentSummary = {
		status: 'Deployment successful.',
		transactionHash: receipt.transactionHash,
		contractAddress,
		owner,
		name: deployedName,
		symbol: deployedSymbol,
		decimals,
		initialSupplyBaseUnits: totalSupply.toString(),
		initialSupplyTokens: DEFAULT_INITIAL_SUPPLY,
		explorer: `${arbitrumSepolia.blockExplorers.default.url}/address/${contractAddress}`,
	};

	const outputFile = path.resolve(__dirname, 'erc20-deployment.json');
	fs.writeFileSync(outputFile, JSON.stringify(deploymentSummary, null, 2));

	console.log('Deployment successful.');
	console.log(`Transaction hash: ${receipt.transactionHash}`);
	console.log(`Contract address: ${contractAddress}`);
	console.log(`Owner: ${owner}`);
	console.log(`Name: ${deployedName}`);
	console.log(`Symbol: ${deployedSymbol}`);
	console.log(`Decimals: ${decimals}`);
	console.log(`Initial supply: ${totalSupply.toString()} base units (${DEFAULT_INITIAL_SUPPLY} tokens)`);
	console.log(`Explorer: ${arbitrumSepolia.blockExplorers.default.url}/address/${contractAddress}`);
	console.log(`Deployment JSON saved: ${outputFile}`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
