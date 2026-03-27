# Cloudflare Tunnel for RPC and Faucet

This repo exposes two local services that can be published through a single Cloudflare Tunnel:

- `localhost:8449` for the Orbit L3 JSON-RPC
- `localhost:3000` for the faucet UI

Important: Cloudflare Tunnel does not give you a public IP address. It gives you public hostnames such as `rpc.example.com` and `faucet.example.com`, which is the normal and recommended setup.

## What stays local

- The faucet backend continues to call the L3 RPC through `L3_RPC=http://127.0.0.1:8449`.
- End users visit the faucet on its public hostname.
- If wallets or scripts need remote JSON-RPC access, point them at the public RPC hostname.

## Prerequisites

1. Your domain is already onboarded to Cloudflare and uses Cloudflare nameservers.
2. The Orbit node is running and reachable on `http://localhost:8449`.
3. The faucet app has a valid `.env` file and starts on `http://localhost:3000`.
4. `cloudflared` is installed on this Windows machine.

## 1. Start the local services

From the repo root, start the Orbit stack:

```powershell
cd .\orbit-setup-script
docker compose up -d
```

Start the faucet from another PowerShell window:

```powershell
cd D:\jayesh\arbitrum-orbit-layer3
.\ops\start-faucet.ps1
```

Confirm both services respond locally:

```powershell
Invoke-WebRequest http://127.0.0.1:8449 -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:3000 -UseBasicParsing
```

## 2. Install and authenticate cloudflared

Cloudflare's current CLI flow for a locally managed tunnel is:

```powershell
cloudflared tunnel login
cloudflared tunnel create orbit-l3
```

The second command prints the tunnel UUID and creates a credentials JSON file in your `.cloudflared` directory.

## 3. Create the tunnel config

Copy the example config and replace the placeholders:

```powershell
Copy-Item .\ops\cloudflared\config.example.yml $env:USERPROFILE\.cloudflared\config.yml
```

Update:

- `<TUNNEL_UUID>` with the UUID from `cloudflared tunnel create orbit-l3`
- `<YOUR_WINDOWS_USER>` with your Windows username
- `<YOUR_DOMAIN>` with your real domain, for example `example.com`

Resulting hostnames will look like:

- `rpc.example.com` -> `http://localhost:8449`
- `faucet.example.com` -> `http://localhost:3000`

## 4. Create DNS routes

Create one DNS route per hostname:

```powershell
cloudflared tunnel route dns orbit-l3 rpc.<YOUR_DOMAIN>
cloudflared tunnel route dns orbit-l3 faucet.<YOUR_DOMAIN>
```

Cloudflare creates CNAME records that point those hostnames to the tunnel.

## 5. Run the tunnel

```powershell
cloudflared tunnel run orbit-l3
```

If you stored the config somewhere else, use:

```powershell
cloudflared tunnel --config C:\Users\<YOUR_WINDOWS_USER>\.cloudflared\config.yml run orbit-l3
```

## 6. Optional: run cloudflared as a Windows service

Once the tunnel works interactively, install it as a service:

```powershell
cloudflared service install
```

Then start it from the Windows service manager or:

```powershell
Start-Service cloudflared
```

## 7. How people should use it

- Faucet users open `https://faucet.<YOUR_DOMAIN>`
- Wallets, scripts, and block explorers can use `https://rpc.<YOUR_DOMAIN>`

Example RPC check:

```powershell
$body = '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
Invoke-RestMethod https://rpc.<YOUR_DOMAIN> -Method Post -ContentType "application/json" -Body $body
```

## Notes

- Keep the faucet signer key private in `faucet/.env`. Do not move it into client-side code.
- If you want rate limiting or login protection for the faucet, add a Cloudflare Access policy in front of `faucet.<YOUR_DOMAIN>`.
- If `cloudflared` cannot connect, verify outbound access to Cloudflare on port `7844`.
