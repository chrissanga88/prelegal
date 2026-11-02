# Stop and remove the Prelegal container.
docker rm -f prelegal 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Prelegal stopped."
} else {
    Write-Host "Prelegal is not running."
}
