Set-Location -LiteralPath $PSScriptRoot
Write-Host "Starting R76 CertiScale..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -LiteralPath '$PSScriptRoot'; npm run api"
Start-Sleep -Seconds 3
Start-Process "http://127.0.0.1:3000/"
