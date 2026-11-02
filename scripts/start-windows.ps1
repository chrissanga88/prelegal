# Build the Prelegal image and run it at http://localhost:8000.
$ErrorActionPreference = "Stop"

$Name = "prelegal"
$Port = 8000
Set-Location (Join-Path $PSScriptRoot "..")

docker build -t $Name .
if ($LASTEXITCODE -ne 0) { throw "docker build failed" }

# Remove any previous container so the database always starts fresh.
if (docker ps -aq --filter "name=^$Name$") {
    docker rm -f $Name | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "docker rm failed" }
}

$envArgs = @()
if (Test-Path ".env") { $envArgs = @("--env-file", ".env") }
docker run -d --name $Name -p "${Port}:8000" @envArgs $Name | Out-Null
if ($LASTEXITCODE -ne 0) { throw "docker run failed" }

Write-Host "Waiting for Prelegal to start..."
for ($i = 0; $i -lt 30; $i++) {
    try {
        Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/api/health" | Out-Null
        Write-Host "Prelegal is running at http://localhost:$Port"
        exit 0
    } catch {
        Start-Sleep -Seconds 1
    }
}

Write-Error "Prelegal did not become healthy in time. Container logs:" -ErrorAction Continue
docker logs $Name
exit 1
