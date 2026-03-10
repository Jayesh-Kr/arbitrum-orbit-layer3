import fs from 'fs'
import path from 'path'
import { ethers } from 'ethers'

import type { L3Config } from '../scripts/l3ConfigType'

const DEFAULT_PARENT_RPC = 'https://sepolia-rollup.arbitrum.io/rpc'
const EXPECTED_FUNDING = ethers.utils.parseEther('0.3')

function formatStatus(balance: ethers.BigNumber) {
  if (balance.gte(EXPECTED_FUNDING)) {
    return 'OK (>= 0.3 ETH)'
  }
  return 'LOW (< 0.3 ETH)'
}

async function main() {
  const configPath = path.resolve(
    process.cwd(),
    'config',
    'orbitSetupScriptConfig.json'
  )

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Could not find config at ${configPath}. Run rollup deploy and copy config files first.`
    )
  }

  const configRaw = fs.readFileSync(configPath, 'utf-8')
  const config: L3Config = JSON.parse(configRaw)

  const l2RpcUrl =
    process.env.L2_RPC_URL ||
    config['parent-chain-node-url'] ||
    DEFAULT_PARENT_RPC

  if (!config.batchPoster) {
    throw new Error('Missing "batchPoster" in orbitSetupScriptConfig.json')
  }
  if (!config.staker) {
    throw new Error(
      'Missing "staker" in orbitSetupScriptConfig.json. Add staker address and rerun.'
    )
  }

  const provider = new ethers.providers.JsonRpcProvider(l2RpcUrl)

  const [batchPosterBalance, stakerBalance] = await Promise.all([
    provider.getBalance(config.batchPoster),
    provider.getBalance(config.staker),
  ])

  console.log(`Parent chain RPC: ${l2RpcUrl}`)
  console.log('')
  console.log(`Batch poster: ${config.batchPoster}`)
  console.log(`Balance: ${ethers.utils.formatEther(batchPosterBalance)} ETH`)
  console.log(`Wei: ${batchPosterBalance.toString()}`)
  console.log(`Status: ${formatStatus(batchPosterBalance)}`)
  console.log('')
  console.log(`Staker: ${config.staker}`)
  console.log(`Balance: ${ethers.utils.formatEther(stakerBalance)} ETH`)
  console.log(`Wei: ${stakerBalance.toString()}`)
  console.log(`Status: ${formatStatus(stakerBalance)}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
