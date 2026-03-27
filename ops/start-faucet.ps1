param(
  [string]$HostName = "127.0.0.1",
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\..\faucet"
try {
  if (-not (Test-Path ".env")) {
    Write-Error "Missing faucet/.env. Create it before starting the faucet."
  }

  Write-Host "Starting faucet on http://${HostName}:$Port"
  npm run dev -- --hostname $HostName --port $Port
}
finally {
  Pop-Location
}
