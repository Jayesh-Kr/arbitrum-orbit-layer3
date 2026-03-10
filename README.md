# Layer 3 Deployment Guide (Arbitrum Orbit)

This repository contains everything needed to deploy a Layer 3 chain on top of Arbitrum Sepolia (Layer 2) using a custom ERC-20 token as the native gas token.

The workflow has two main parts:

1. **`deploy_chain/`** - Deploy the custom token and the rollup contracts onto Arbitrum Sepolia.
2. **`orbit-setup-script/`** - Start the Orbit node and run the post-deployment setup (fund validators, deploy token bridge, configure the chain).

---

## Prerequisites

- Node.js >= 18
- pnpm (for `deploy_chain/`)
- Docker and Docker Compose (for `orbit-setup-script/`)
- A funded wallet on Arbitrum Sepolia

---

## Part 1: deploy_chain

Install dependencies once from the `deploy_chain/` directory:

```bash
cd deploy_chain
pnpm install
```

### Step 1: Deploy the Custom ERC-20 Token

This script compiles and deploys your custom ERC-20 token to Arbitrum Sepolia. This token will be used as the native gas token for your L3 chain.

**Configure environment variables:**

Copy `.env.example` to `.env` inside `create-custom-token/`:

```bash
cp create-custom-token/.env.example create-custom-token/.env
```

Fill in the values:

```env
DEPLOYER_PRIVATE_KEY=0xYourPrivateKey
TOKEN_NAME=MyToken
TOKEN_SYMBOL=MTK
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc   # optional
```

**Run the deployment:**

```bash
pnpm run deploy:erc20
```

On success, the contract address and deployment details are saved to `create-custom-token/erc20-deployment.json`. Note the `contractAddress` field — this is your `CUSTOM_FEE_TOKEN_ADDRESS` for the next step.

---

### Step 2: Deploy the Rollup Contracts

This script deploys the full Arbitrum Orbit rollup on Arbitrum Sepolia using your custom token as the native fee token. It generates:

- `nodeConfig.json` — the node configuration for running your Orbit chain
- `orbitSetupConfig.json` — the contract addresses and chain metadata needed by the setup script

**Configure environment variables:**

Copy `.env.example` to `.env` inside `create-rollup-custom-fee-token/`:

```bash
cp create-rollup-custom-fee-token/.env.example create-rollup-custom-fee-token/.env
```

Fill in the values:

```env
DEPLOYER_PRIVATE_KEY=0xYourPrivateKey
CUSTOM_FEE_TOKEN_ADDRESS=0xYourCustomTokenAddress   # from Step 1
PARENT_CHAIN_RPC=https://arbitrum-sepolia.infura.io/v3/YOUR_API_KEY

# Optional — generated randomly if not provided (keep them different from each other)
BATCH_POSTER_PRIVATE_KEY=
VALIDATOR_PRIVATE_KEY=
```

**Run the deployment:**

```bash
node create-rollup-custom-fee-token/index.js
```

When the script completes, it prints all deployed contract addresses and saves two files to the `create-rollup-custom-fee-token/` directory:

- `nodeConfig.json`
- `orbitSetupConfig.json`

Keep this terminal output — it includes the batch poster and validator private keys, which you will need later.

---

## Part 2: orbit-setup-script

### Step 3: Prepare the Config Files

Copy the two files generated in Step 2 into the `orbit-setup-script/config/` directory:

```bash
cp deploy_chain/create-rollup-custom-fee-token/nodeConfig.json orbit-setup-script/config/nodeConfig.json
cp deploy_chain/create-rollup-custom-fee-token/orbitSetupConfig.json orbit-setup-script/config/orbitSetupScriptConfig.json
```

> Note: the setup script expects the file to be named `orbitSetupScriptConfig.json`.

---

### Step 4: Edit nodeConfig.json

Before starting the node, you must apply three manual edits to `orbit-setup-script/config/nodeConfig.json`.

**1. Add the `validation` block** (WASM module roots for the Nitro validator):

```json
"validation": {
  "wasm": {
    "allowed-wasm-module-roots": [
      "/home/user/nitro-legacy/machines",
      "/home/user/target/machines"
    ]
  }
}
```

**2. Disable the block validator:**

```json
"block-validator": {
  "enable": false
}
```

**3. Disable the staker:**

Find the `"staker"` section and set `"enable"` to `false`:

```json
"staker": {
  "enable": false
}
```

These fields can be added or updated at the top level of the `node` object inside `nodeConfig.json`.

---

### Step 5: Start the Orbit Node with Docker

From inside the `orbit-setup-script/` directory:

```bash
cd orbit-setup-script
docker compose up -d
```

This starts the Orbit chain node. The public RPC will be available at `http://localhost:8449` and the BlockScout explorer at `http://localhost`.

To follow the node logs:

```bash
docker compose logs -f nitro
```

Wait until the node is producing blocks before proceeding.

---

### Step 6: Install Dependencies and Run the Setup Script

```bash
cd orbit-setup-script
yarn install
```

Then run the setup script with your environment variables:

```bash
PRIVATE_KEY="0xYourDeployerPrivateKey" \
L2_RPC_URL="https://sepolia-rollup.arbitrum.io/rpc" \
L3_RPC_URL="http://localhost:8449" \
yarn run setup
```

The setup script performs the following operations in order:

1. **Funds the batch poster and staker** wallets with 0.3 ETH each on the parent chain.
2. **Deposits the native token** from L2 to your account on the L3 chain.
3. **Deploys the token bridge** contracts on both the parent chain and the Orbit chain.
4. **Configures the Orbit chain** — sets minimum base fee, network fee receiver, and infrastructure fee collector.
5. **Transfers ownership** from the rollup owner to the upgrade executor.

If the script fails at any step, it saves progress to `config/resumeState.json`. Re-running the script will resume from where it left off automatically.

---

### Step 7 (Optional): Transfer Custom Tokens from L2 to L3

Once the chain and token bridge are running, use this script to deposit your custom ERC-20 token from Arbitrum Sepolia into your L3 chain. It does this in two on-chain steps:

1. **Approve** — calls `approve` on the ERC-20 token contract so the Inbox contract is permitted to spend the specified amount on your behalf.
2. **Deposit** — calls `depositERC20` on the Inbox contract, which bridges the tokens to your account on the L3 chain.

After both transactions confirm on L2, the tokens will appear on the L3 chain within approximately one minute.

**Configure environment variables:**

```bash
cp deploy_chain/transfer-custom-token-l2-l3/.env.example deploy_chain/transfer-custom-token-l2-l3/.env
```

```env
SENDER_PRIVATE_KEY=0xYourPrivateKey
CUSTOM_TOKEN_ADDRESS=0xYourCustomTokenAddress    # from Step 1 (erc20-deployment.json)
INBOX_ADDRESS=0xInboxContractAddress             # from orbitSetupConfig.json (inbox field)
AMOUNT_TO_SEND=1000                              # amount in ether units, e.g. 1000
```

**Run the transfer:**

```bash
node deploy_chain/transfer-custom-token-l2-l3/transfer.js
```

The script logs the approval transaction hash, the deposit transaction hash, and a confirmation message once both are mined. The tokens will arrive on your L3 account after the next L2-to-L3 message is processed.

---

## Refunding Validators

To retrieve remaining balances from the batch poster and validator wallets back to your wallet, run:

```bash
PRIVATE_KEY="0xYourDeployerPrivateKey" \
L2_RPC_URL="https://sepolia-rollup.arbitrum.io/rpc" \
TARGET_ADDRESS="0xYourTargetAddress" \
yarn run refund
```

Run this from inside the `orbit-setup-script/` directory.

---

## Directory Structure

```
deploy_chain/
  create-custom-token/             # Step 1: Deploy custom ERC-20 token
  create-rollup-custom-fee-token/  # Step 2: Deploy rollup contracts
  create-token-bridge-custom-fee-token/  # Called by setup script internally
  transfer-custom-token-l2-l3/    # Step 7: Bridge tokens to L3

orbit-setup-script/
  config/                          # Place nodeConfig.json and orbitSetupScriptConfig.json here
  scripts/                         # TypeScript setup scripts
  docker-compose.yaml              # Starts the Orbit node
```
