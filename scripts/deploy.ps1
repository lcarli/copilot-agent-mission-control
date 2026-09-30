[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidateSet('Bootstrap', 'Artifacts', 'Workshop')][string] $Stage,
  [Parameter(Mandatory)][ValidatePattern('^[0-9a-fA-F-]{36}$')][string] $SubscriptionId,
  [Parameter(Mandatory)][ValidatePattern('^[a-z0-9]+$')][string] $Location,
  [ValidatePattern('^[a-z][a-z0-9-]{1,7}$')][string] $EnvironmentName = 'dev',
  [ValidatePattern('^[a-z][a-z0-9-]{1,11}$')][string] $WorkloadName = 'camc',
  [string] $Owner = $env:USERNAME,
  [string] $ResourceGroupName,
  [string] $FoundationDeploymentName,
  [string] $ReleaseManifestPath,
  [string] $HostedSettingsPath,
  [bool] $KeyVaultPurgeProtectionEnabled = $true,
  [switch] $PreviewOnly,
  [switch] $Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$template = Join-Path $workspace 'infra\deploy.bicep'
$bootstrapImage = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
$deploymentName = "mission-control-$EnvironmentName"
if ([string]::IsNullOrWhiteSpace($ResourceGroupName)) { $ResourceGroupName = "rg-$WorkloadName-$EnvironmentName" }
if ([string]::IsNullOrWhiteSpace($FoundationDeploymentName)) { $FoundationDeploymentName = "$deploymentName-bootstrap" }
if ([string]::IsNullOrWhiteSpace($ReleaseManifestPath)) { $ReleaseManifestPath = Join-Path $workspace '.azure\hosted-release.json' }
if ([string]::IsNullOrWhiteSpace($Owner)) { throw 'An explicit Owner is required.' }

function Assert-Command {
  param([string] $Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Required command '$Name' is unavailable." }
}

function Read-ClosedJson {
  param([string] $Path, [string[]] $Keys)
  if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw 'A required settings or release JSON file is missing.'
  }
  $value = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -AsHashtable
  if ($value -isnot [hashtable] -or $value.Count -ne $Keys.Count) { throw 'JSON does not match the required closed configuration.' }
  foreach ($key in $Keys) {
    if (-not $value.ContainsKey($key) -or $value[$key] -isnot [string] -or [string]::IsNullOrWhiteSpace($value[$key])) {
      throw "Configuration requires a nonempty string for '$key'."
    }
  }
  return $value
}

function Assert-Guid {
  param([string] $Value, [string] $Name)
  if ($Value -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
    throw "$Name must be a GUID."
  }
}

function Invoke-AzureCli {
  param([Parameter(Mandatory)][string[]] $Arguments, [switch] $AllowEmpty)
  $output = & az @Arguments --subscription $SubscriptionId --only-show-errors 2>&1
  if ($LASTEXITCODE -ne 0) { throw "az $($Arguments -join ' ') failed:`n$($output -join [Environment]::NewLine)" }
  $text = ($output -join [Environment]::NewLine).Trim()
  if (-not $AllowEmpty -and [string]::IsNullOrWhiteSpace($text)) { throw 'Azure CLI returned no required result.' }
  return $text
}

function Confirm-Stage {
  if (-not $Force -and (Read-Host "Type '$($Stage.ToLowerInvariant())' to execute this stage for '$ResourceGroupName' in '$SubscriptionId'") -cne $Stage.ToLowerInvariant()) {
    throw 'Stage cancelled by the operator.'
  }
}

function Assert-Environment {
  $group = Invoke-AzureCli @('group', 'show', '--name', $ResourceGroupName, '--output', 'json') | ConvertFrom-Json
  if ($group.tags.managedBy -ne 'bicep' -or $group.tags.workload -ne $WorkloadName -or
      $group.tags.environment -ne $EnvironmentName -or $group.location -ne $Location) {
    throw 'Resource group ownership, environment or location does not match.'
  }
}

function Get-Foundation {
  Assert-Environment
  $result = Invoke-AzureCli @('deployment', 'sub', 'show', '--name', $FoundationDeploymentName, '--query', 'properties.outputs', '--output', 'json') | ConvertFrom-Json
  if ($result.resourceGroupName.value -ne $ResourceGroupName) { throw 'Foundation deployment belongs to another resource group.' }
  return $result
}

function Write-Parameters {
  param([string] $Path, [hashtable] $Runtime, [string] $SeederPrincipalId = '')
  $values = @{
    resourceGroupName = $ResourceGroupName
    location = $Location
    workloadName = $WorkloadName
    environmentName = $EnvironmentName
    owner = $Owner
    keyVaultPurgeProtectionEnabled = $KeyVaultPurgeProtectionEnabled
    campaignSeederPrincipalId = $SeederPrincipalId
    runtimeConfiguration = $Runtime
  }
  $parameters = @{}
  foreach ($entry in $values.GetEnumerator()) { $parameters[$entry.Key] = @{ value = $entry.Value } }
  @{
    '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
    contentVersion = '1.0.0.0'
    parameters = $parameters
  } | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $Path -Encoding utf8
}

function Invoke-Deployment {
  param([string] $Name, [string] $Parameters)
  $common = @('--location', $Location, '--template-file', $template, '--parameters', "@$Parameters")
  Invoke-AzureCli -Arguments (@('deployment', 'sub', 'validate') + $common + @('--output', 'none')) -AllowEmpty | Out-Null
  $preview = Invoke-AzureCli -Arguments (@('deployment', 'sub', 'what-if') + $common + @('--no-pretty-print', '--output', 'json')) | ConvertFrom-Json
  if (@($preview.changes | Where-Object changeType -eq 'Delete').Count -ne 0) { throw 'The stage would delete resources; review the migration separately.' }
  $preview.changes | Select-Object changeType, resourceId | Format-Table
  if ($PreviewOnly) {
    Write-Host 'Preview only: no Azure resources or artifacts were changed.'
    return
  }
  Confirm-Stage
  $result = Invoke-AzureCli -Arguments (@('deployment', 'sub', 'create', '--name', $Name) + $common + @('--query', 'properties.outputs', '--output', 'json')) | ConvertFrom-Json
  Write-Host "Applied '$($result.runtime.value.mode)' profile. API: $($result.runtime.value.apiUrl); dashboard: $($result.runtime.value.dashboardUrl)"
  Write-Host 'This is not workshop go/no-go approval; complete the live-service and human gates.'
}

function Confirm-Descriptor {
  param([object] $Foundation, [string] $BlobName, [string] $Sha256, [string] $TemporaryDirectory)
  $storage = @('--auth-mode', 'login', '--account-name', $Foundation.data.value.campaigns.storageAccountName,
    '--container-name', $Foundation.data.value.campaigns.containerName, '--name', $BlobName)
  $metadata = Invoke-AzureCli -Arguments (@('storage', 'blob', 'show') + $storage + @('--output', 'json')) | ConvertFrom-Json
  if ($metadata.properties.contentLength -lt 1 -or $metadata.properties.contentLength -gt 1000000) {
    throw 'The published campaign descriptor exceeds its byte limit.'
  }
  $download = Join-Path $TemporaryDirectory 'runtime-downloaded.json'
  Invoke-AzureCli -Arguments (@('storage', 'blob', 'download') + $storage +
    @('--file', $download, '--if-match', $metadata.properties.etag, '--output', 'none')) -AllowEmpty | Out-Null
  if ((Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash.ToLowerInvariant() -cne $Sha256) {
    throw 'The published descriptor does not match the release digest.'
  }
}

Assert-Guid $SubscriptionId 'SubscriptionId'
$settings = @{}
$release = @{}
if ($Stage -eq 'Workshop') {
  $settings = Read-ClosedJson $HostedSettingsPath @('entraTenantId', 'entraApiClientId', 'entraSpaClientId', 'unitSigningSecretName', 'unitSigningSecretVersion')
  foreach ($name in @('entraTenantId', 'entraApiClientId', 'entraSpaClientId')) { Assert-Guid $settings[$name] $name }
  if ($settings.entraApiClientId -eq $settings.entraSpaClientId) { throw 'API and SPA registrations must be distinct.' }
  if ($settings.unitSigningSecretName -notmatch '^[a-zA-Z0-9-]{1,127}$' -or $settings.unitSigningSecretVersion -cnotmatch '^[0-9a-f]{32}$') {
    throw 'A named, pinned Key Vault secret version is required; secret material is not accepted.'
  }
  $release = Read-ClosedJson $ReleaseManifestPath @('schemaVersion', 'sourceCommit', 'subscriptionId', 'resourceGroupName',
    'apiImage', 'dashboardImage', 'campaignRuntimeBlobUrl', 'campaignRuntimeSha256')
  if ($release.schemaVersion -cne '1.0' -or $release.sourceCommit -cnotmatch '^[0-9a-f]{40}$' -or
      $release.campaignRuntimeSha256 -cnotmatch '^[0-9a-f]{64}$') { throw 'Invalid release version, source commit or descriptor digest.' }
  if ($release.subscriptionId -ne $SubscriptionId -or $release.resourceGroupName -ne $ResourceGroupName) {
    throw 'Release manifest belongs to another deployment destination.'
  }
  foreach ($name in @('apiImage', 'dashboardImage')) {
    if ($release[$name] -cnotmatch '^[a-z0-9]+\.azurecr\.io/[a-z0-9-]+@sha256:[0-9a-f]{64}$') {
      throw 'Workshop promotion requires immutable Azure registry image digests, never bootstrap images or mutable tags.'
    }
  }
}
if ($Stage -eq 'Artifacts') {
  Assert-Command 'git'
  Assert-Command 'pnpm'
  if (Test-Path -LiteralPath $ReleaseManifestPath) { throw 'Release manifest already exists. Select a new path; do not overwrite release evidence.' }
  $sourceCommit = (& git -C $workspace rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or $sourceCommit -cnotmatch '^[0-9a-f]{40}$') { throw 'Cannot resolve a committed source revision.' }
  $dirty = & git -C $workspace status --porcelain
  if ($LASTEXITCODE -ne 0 -or -not [string]::IsNullOrWhiteSpace(($dirty -join ''))) {
    throw 'Artifact publication requires a clean committed worktree.'
  }
}

Assert-Command 'az'
$account = Invoke-AzureCli @('account', 'show', '--output', 'json') | ConvertFrom-Json
if ($account.id -ne $SubscriptionId -or $account.environmentName -ne 'AzureCloud') { throw 'The requested public-cloud subscription is not the selected command context.' }
if ($Stage -eq 'Workshop' -and $settings.entraTenantId -ne $account.tenantId) { throw 'Instructor tenant must match the deployment tenant.' }

$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "mission-control-deploy-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null
try {
  if ($Stage -eq 'Bootstrap') {
    $exists = Invoke-AzureCli @('group', 'exists', '--name', $ResourceGroupName, '--output', 'tsv')
    if ($exists -eq 'true') {
      Assert-Environment
      $apps = Invoke-AzureCli @('containerapp', 'list', '--resource-group', $ResourceGroupName, '--output', 'json') | ConvertFrom-Json
      foreach ($app in $apps) {
        foreach ($container in $app.properties.template.containers) {
          if ($container.image -ne $bootstrapImage) { throw 'Bootstrap would replace a non-bootstrap application. Use Workshop or a separately reviewed migration.' }
        }
      }
    }
    foreach ($provider in @('Microsoft.App', 'Microsoft.Authorization', 'Microsoft.ContainerRegistry', 'Microsoft.DocumentDB',
      'Microsoft.Insights', 'Microsoft.KeyVault', 'Microsoft.OperationalInsights', 'Microsoft.SignalRService', 'Microsoft.Storage')) {
      if ((Invoke-AzureCli @('provider', 'show', '--namespace', $provider, '--query', 'registrationState', '--output', 'tsv')) -ne 'Registered') {
        throw "Provider '$provider' must be registered separately before bootstrap."
      }
    }
    $principal = if ($account.user.type -eq 'user') {
      Invoke-AzureCli @('ad', 'signed-in-user', 'show', '--query', 'id', '--output', 'tsv')
    } else {
      Invoke-AzureCli @('ad', 'sp', 'show', '--id', $account.user.name, '--query', 'id', '--output', 'tsv')
    }
    $parameters = Join-Path $temporaryDirectory 'bootstrap.parameters.json'
    Write-Parameters $parameters @{ mode = 'bootstrap' } $principal
    Invoke-Deployment $FoundationDeploymentName $parameters
    return
  }

  $foundation = Get-Foundation
  $registry = $foundation.runtime.value.registryLoginServer
  if ($registry -cnotmatch '^[a-z0-9]+\.azurecr\.io$') { throw 'Foundation registry is not a public-cloud Azure registry.' }
  $registryName = $registry.Split('.')[0]
  $blobBase = "$($foundation.data.value.campaigns.blobEndpoint.TrimEnd('/'))/$($foundation.data.value.campaigns.containerName)"

  if ($Stage -eq 'Artifacts') {
    Write-Host "Build and publish two linux/amd64 application images from $sourceCommit to $registry, plus the private runtime descriptor."
    if ($PreviewOnly) {
      Write-Host 'Preview only: no build, upload or release manifest was produced.'
      return
    }
    Confirm-Stage
    $archive = Join-Path $temporaryDirectory 'source.zip'
    $source = Join-Path $temporaryDirectory 'source'
    # Publish a committed, allowlisted snapshot, never the operator's live directory or ignored credentials.
    & git -C $workspace archive --format=zip --output $archive $sourceCommit -- `
      package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json .dockerignore apps packages `
      campaigns/operation-lighthouse/package.json campaigns/operation-lighthouse/tsconfig.json `
      campaigns/operation-lighthouse/tsconfig.build.json campaigns/operation-lighthouse/src `
      campaigns/operation-lighthouse/scripts/generate-runtime.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Unable to snapshot the committed application sources.' }
    Expand-Archive -LiteralPath $archive -DestinationPath $source
    Push-Location $source
    try {
      & pnpm install --frozen-lockfile
      if ($LASTEXITCODE -ne 0) { throw 'Snapshot dependency installation failed.' }
      & pnpm build:hosted
      if ($LASTEXITCODE -ne 0) { throw 'Hosted build failed; no artifacts were published.' }
    } finally { Pop-Location }
    $descriptor = Join-Path $source 'campaigns\operation-lighthouse\dist\runtime.json'
    $descriptorHash = (Get-FileHash -LiteralPath $descriptor -Algorithm SHA256).Hash.ToLowerInvariant()
    $declaredHash = ((Get-Content -LiteralPath (Join-Path $source 'campaigns\operation-lighthouse\dist\runtime.sha256') -Raw).Trim() -split '\s+')[0]
    if ($declaredHash -cne $descriptorHash -or (Get-Item -LiteralPath $descriptor).Length -gt 1000000) { throw 'Local descriptor integrity check failed.' }
    $tag = "$($sourceCommit.Substring(0, 12))-$([guid]::NewGuid().ToString('N').Substring(0, 12))"
    $images = @{}
    foreach ($image in @(
      @{ name = 'apiImage'; repository = 'mission-control-api'; dockerfile = 'apps\api\Dockerfile' },
      @{ name = 'dashboardImage'; repository = 'command-center'; dockerfile = 'apps\command-center\Dockerfile' }
    )) {
      Invoke-AzureCli @('acr', 'build', '--registry', $registryName, '--file', $image.dockerfile,
        '--image', "$($image.repository):$tag", '--platform', 'linux/amd64', '--build-arg', "VCS_REF=$sourceCommit", $source) -AllowEmpty | Out-Null
      $digest = Invoke-AzureCli @('acr', 'manifest', 'show-metadata', '--registry', $registryName,
        '--name', "$($image.repository):$tag", '--query', 'digest', '--output', 'tsv')
      if ($digest -cnotmatch '^sha256:[0-9a-f]{64}$') { throw 'Registry did not return an immutable image digest.' }
      $images[$image.name] = "$registry/$($image.repository)@$digest"
    }
    $blob = "operation-lighthouse/1.0.0/$descriptorHash/runtime.json"
    $storage = @('--auth-mode', 'login', '--account-name', $foundation.data.value.campaigns.storageAccountName,
      '--container-name', $foundation.data.value.campaigns.containerName, '--name', $blob)
    $exists = Invoke-AzureCli -Arguments (@('storage', 'blob', 'exists') + $storage + @('--query', 'exists', '--output', 'tsv'))
    if ($exists -eq 'false') {
      Invoke-AzureCli -Arguments (@('storage', 'blob', 'upload') + $storage +
        @('--file', $descriptor, '--content-type', 'application/json', '--overwrite', 'false', '--if-none-match', '*', '--output', 'none')) -AllowEmpty | Out-Null
    } elseif ($exists -ne 'true') { throw 'Blob existence check did not return a valid result.' }
    Confirm-Descriptor $foundation $blob $descriptorHash $temporaryDirectory
    $release = @{
      schemaVersion = '1.0'
      sourceCommit = $sourceCommit
      subscriptionId = $SubscriptionId
      resourceGroupName = $ResourceGroupName
      apiImage = $images.apiImage
      dashboardImage = $images.dashboardImage
      campaignRuntimeBlobUrl = "$blobBase/$blob"
      campaignRuntimeSha256 = $descriptorHash
    }
    $release | ConvertTo-Json | Out-File -LiteralPath $ReleaseManifestPath -Encoding utf8 -NoClobber
    Write-Host "Release manifest written to '$ReleaseManifestPath'. No Container Apps were promoted."
    return
  }

  foreach ($image in @(@{ name = 'apiImage'; repository = 'mission-control-api' }, @{ name = 'dashboardImage'; repository = 'command-center' })) {
    $prefix = "$registry/$($image.repository)@"
    if (-not $release[$image.name].StartsWith($prefix, [System.StringComparison]::Ordinal)) { throw 'Release image is outside the expected registry/repository.' }
    $digest = $release[$image.name].Substring($prefix.Length)
    $actual = Invoke-AzureCli @('acr', 'manifest', 'show-metadata', '--registry', $registryName,
      '--name', "$($image.repository)@$digest", '--query', 'digest', '--output', 'tsv')
    if ($actual -cne $digest) { throw 'Release image is missing or does not match its recorded digest.' }
  }
  $blob = "operation-lighthouse/1.0.0/$($release.campaignRuntimeSha256)/runtime.json"
  if ($release.campaignRuntimeBlobUrl -cne "$blobBase/$blob") { throw 'Release descriptor is outside the checksum-addressed campaign container.' }
  Confirm-Descriptor $foundation $blob $release.campaignRuntimeSha256 $temporaryDirectory
  $runtime = @{
    mode = 'workshop'
    apiImage = $release.apiImage
    dashboardImage = $release.dashboardImage
    campaignRuntimeBlobUrl = $release.campaignRuntimeBlobUrl
    campaignRuntimeSha256 = $release.campaignRuntimeSha256
    dashboardOrigin = $foundation.runtime.value.dashboardUrl
  }
  foreach ($entry in $settings.GetEnumerator()) { $runtime[$entry.Key] = $entry.Value }
  $parameters = Join-Path $temporaryDirectory 'workshop.parameters.json'
  Write-Parameters $parameters $runtime
  Invoke-Deployment $deploymentName $parameters
}
finally {
  Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force
}
