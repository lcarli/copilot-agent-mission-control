[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repoRoot
try {
    & pnpm --filter '@mission-control/participant-cli' build
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    & node 'apps\participant-cli\dist\cli.js' preflight
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
