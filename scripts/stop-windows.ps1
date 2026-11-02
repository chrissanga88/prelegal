# Stop and remove the Prelegal container.
$ErrorActionPreference = "Stop"

$Name = "prelegal"
if (docker ps -aq --filter "name=^$Name$") {
    docker rm -f $Name | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "docker rm failed" }
    Write-Host "Prelegal stopped."
} else {
    Write-Host "Prelegal is not running."
}
