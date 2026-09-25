[CmdletBinding()]
param(
  [string] $SubscriptionId = '4e4f76f7-bfb7-4163-84bd-2a19561451b5',
  [string] $Location = 'canadaeast',
  [string] $EnvironmentName = 'dev',
  [string] $WorkloadName = 'camc',
  [string] $Owner = $env:USERNAME,
  [string] $ResourceGroupName,
  [string] $CampaignPath = 'campaigns\operation-lighthouse',
  [string] $BootstrapImage = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest',
  [bool] $KeyVaultPurgeProtectionEnabled = $false,
  [switch] $PreviewOnly,
  [switch] $Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$workspace = Split-Path -Parent $PSScriptRoot
$template = Join-Path $workspace 'infra\deploy.bicep'
$campaignDirectory = Join-Path $workspace $CampaignPath
$deploymentName = "mission-control-$EnvironmentName"
$apiRepository = 'mission-control-api'
$dashboardRepository = 'command-center'

if ([string]::IsNullOrWhiteSpace($ResourceGroupName)) {
  $ResourceGroupName = "rg-$WorkloadName-$EnvironmentName"
}

function Assert-Command {
  param([Parameter(Mandatory)][string] $Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found on PATH."
  }
}

function Invoke-AzureCli {
  param(
    [Parameter(Mandatory)][string[]] $Arguments,
    [switch] $AllowEmpty
  )

  $output = & az @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "az $($Arguments -join ' ') failed:`n$($output -join [Environment]::NewLine)"
  }

  $text = ($output -join [Environment]::NewLine).Trim()
  if (-not $AllowEmpty -and [string]::IsNullOrWhiteSpace($text)) {
    throw "az $($Arguments -join ' ') returned no output."
  }

  return $text
}

function Invoke-AzureCliWithRetry {
  param(
    [Parameter(Mandatory)][string[]] $Arguments,
    [int] $Attempts = 8,
    [int] $DelaySeconds = 15
  )

  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
      return Invoke-AzureCli -Arguments $Arguments
    }
    catch {
      if ($attempt -eq $Attempts) {
        throw
      }

      Write-Warning "Azure operation has not propagated yet (attempt $attempt/$Attempts). Retrying..."
      Start-Sleep -Seconds $DelaySeconds
    }
  }
}

function Get-SignedInPrincipalId {
  $account = Invoke-AzureCli -Arguments @('account', 'show', '--output', 'json') | ConvertFrom-Json
  if ($account.user.type -eq 'user') {
    return Invoke-AzureCli -Arguments @('ad', 'signed-in-user', 'show', '--query', 'id', '--output', 'tsv')
  }

  return Invoke-AzureCli -Arguments @(
    'ad', 'sp', 'show',
    '--id', $account.user.name,
    '--query', 'id',
    '--output', 'tsv'
  )
}

function Get-DeploymentParameters {
  param(
    [Parameter(Mandatory)][string] $SeederPrincipalId,
    [Parameter(Mandatory)][string] $ApiImage,
    [Parameter(Mandatory)][string] $DashboardImage
  )

  return @(
    "resourceGroupName=$ResourceGroupName"
    "location=$Location"
    "workloadName=$WorkloadName"
    "environmentName=$EnvironmentName"
    "owner=$Owner"
    "campaignSeederPrincipalId=$SeederPrincipalId"
    "keyVaultPurgeProtectionEnabled=$($KeyVaultPurgeProtectionEnabled.ToString().ToLowerInvariant())"
    "apiImage=$ApiImage"
    "dashboardImage=$DashboardImage"
  )
}

function Invoke-SubscriptionDeployment {
  param(
    [Parameter(Mandatory)][string[]] $Parameters
  )

  $arguments = @(
    'deployment', 'sub', 'create',
    '--name', $deploymentName,
    '--location', $Location,
    '--template-file', $template,
    '--parameters'
  ) + $Parameters + @('--query', 'properties.outputs', '--output', 'json')

  return Invoke-AzureCli -Arguments $arguments | ConvertFrom-Json
}

Assert-Command -Name 'az'
Assert-Command -Name 'git'
Assert-Command -Name 'pnpm'

if (-not (Test-Path -LiteralPath $template -PathType Leaf)) {
  throw "Deployment template not found: $template"
}
if (-not (Test-Path -LiteralPath $campaignDirectory -PathType Container)) {
  throw "Campaign directory not found: $campaignDirectory"
}
if ([string]::IsNullOrWhiteSpace($Owner)) {
  throw 'Owner must be supplied explicitly when the current environment has no username.'
}

Invoke-AzureCli -Arguments @('account', 'set', '--subscription', $SubscriptionId) -AllowEmpty | Out-Null
$account = Invoke-AzureCli -Arguments @(
  'account', 'show',
  '--query', '{id:id,name:name,tenantId:tenantId}',
  '--output', 'json'
) | ConvertFrom-Json

foreach ($provider in @(
  'Microsoft.App',
  'Microsoft.Authorization',
  'Microsoft.ContainerRegistry',
  'Microsoft.DocumentDB',
  'Microsoft.Insights',
  'Microsoft.KeyVault',
  'Microsoft.OperationalInsights',
  'Microsoft.SignalRService',
  'Microsoft.Storage'
)) {
  $state = Invoke-AzureCli -Arguments @(
    'provider', 'show',
    '--namespace', $provider,
    '--query', 'registrationState',
    '--output', 'tsv'
  )
  if ($state -ne 'Registered') {
    throw "Azure provider '$provider' is '$state'. Register it before deployment."
  }
}

Invoke-AzureCli -Arguments @('bicep', 'build', '--file', $template, '--stdout') | Out-Null
$seederPrincipalId = Get-SignedInPrincipalId
$commitSha = (& git -C $workspace rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $commitSha -notmatch '^[0-9a-f]{40}$') {
  throw 'Unable to resolve the current Git commit SHA.'
}
$imageTag = $commitSha.Substring(0, 12)
$bootstrapParameters = Get-DeploymentParameters `
  -SeederPrincipalId $seederPrincipalId `
  -ApiImage $BootstrapImage `
  -DashboardImage $BootstrapImage

$validationArguments = @(
  'deployment', 'sub', 'validate',
  '--location', $Location,
  '--template-file', $template,
  '--parameters'
) + $bootstrapParameters
Invoke-AzureCli -Arguments $validationArguments | Out-Null

Write-Host "`nAzure what-if for subscription $($account.name) ($($account.id)):"
& az deployment sub what-if `
  --location $Location `
  --template-file $template `
  --parameters @bootstrapParameters
if ($LASTEXITCODE -ne 0) {
  throw 'Azure what-if failed.'
}

if ($PreviewOnly) {
  Write-Host 'Preview completed; no Azure resources were changed.'
  return
}

if (-not $Force) {
  $confirmation = Read-Host "Type 'deploy' to create or update '$ResourceGroupName' in '$Location'"
  if ($confirmation -cne 'deploy') {
    throw 'Deployment cancelled by the user.'
  }
}

$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "mission-control-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null

try {
  Write-Host "`nDeploying bootstrap infrastructure..."
  $outputs = Invoke-SubscriptionDeployment -Parameters $bootstrapParameters
  $registryLoginServer = $outputs.runtime.value.registryLoginServer
  $registryName = $registryLoginServer.Split('.')[0]

  Write-Host 'Importing immutable bootstrap images into ACR...'
  Invoke-AzureCli -Arguments @(
    'acr', 'import',
    '--name', $registryName,
    '--source', $BootstrapImage,
    '--image', "${apiRepository}:$imageTag",
    '--force'
  ) -AllowEmpty | Out-Null
  Invoke-AzureCli -Arguments @(
    'acr', 'import',
    '--name', $registryName,
    '--source', $BootstrapImage,
    '--image', "${dashboardRepository}:$imageTag",
    '--force'
  ) -AllowEmpty | Out-Null

  $apiDigest = Invoke-AzureCli -Arguments @(
    'acr', 'manifest', 'show-metadata',
    '--registry', $registryName,
    '--name', "${apiRepository}:$imageTag",
    '--query', 'digest',
    '--output', 'tsv'
  )
  $dashboardDigest = Invoke-AzureCli -Arguments @(
    'acr', 'manifest', 'show-metadata',
    '--registry', $registryName,
    '--name', "${dashboardRepository}:$imageTag",
    '--query', 'digest',
    '--output', 'tsv'
  )
  $apiImage = "$registryLoginServer/$apiRepository@$apiDigest"
  $dashboardImage = "$registryLoginServer/$dashboardRepository@$dashboardDigest"

  Write-Host 'Promoting image digests to Container Apps...'
  $immutableParameters = Get-DeploymentParameters `
    -SeederPrincipalId $seederPrincipalId `
    -ApiImage $apiImage `
    -DashboardImage $dashboardImage
  $outputs = Invoke-SubscriptionDeployment -Parameters $immutableParameters

  $campaignPackage = Get-Content -LiteralPath (Join-Path $campaignDirectory 'package.json') -Raw |
    ConvertFrom-Json
  $campaignName = $campaignPackage.name -replace '^@[^/]+/', ''
  $packOutput = & pnpm --dir $campaignDirectory pack --pack-destination $temporaryDirectory
  if ($LASTEXITCODE -ne 0) {
    throw 'Campaign archive creation failed.'
  }
  $archivePath = ($packOutput | Select-Object -Last 1).Trim()
  if (-not [System.IO.Path]::IsPathRooted($archivePath)) {
    $archivePath = Join-Path $workspace $archivePath
  }
  if (-not (Test-Path -LiteralPath $archivePath -PathType Leaf)) {
    throw "Campaign archive was not produced at '$archivePath'."
  }
  $archiveName = Split-Path -Leaf $archivePath

  $checksum = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  $checksumPath = Join-Path $temporaryDirectory "$archiveName.sha256"
  Set-Content -LiteralPath $checksumPath -Value "$checksum  $archiveName" -NoNewline
  $campaignBlob = "$campaignName/$($campaignPackage.version)/$checksum/$archiveName"
  $checksumBlob = "$campaignBlob.sha256"
  $storageAccountName = $outputs.data.value.campaigns.storageAccountName

  Write-Host 'Uploading immutable campaign package...'
  Invoke-AzureCliWithRetry -Arguments @(
    'storage', 'blob', 'upload',
    '--auth-mode', 'login',
    '--account-name', $storageAccountName,
    '--container-name', $outputs.data.value.campaigns.containerName,
    '--file', $archivePath,
    '--name', $campaignBlob,
    '--overwrite', 'false',
    '--output', 'none'
  ) | Out-Null
  Invoke-AzureCliWithRetry -Arguments @(
    'storage', 'blob', 'upload',
    '--auth-mode', 'login',
    '--account-name', $storageAccountName,
    '--container-name', $outputs.data.value.campaigns.containerName,
    '--file', $checksumPath,
    '--name', $checksumBlob,
    '--overwrite', 'false',
    '--output', 'none'
  ) | Out-Null

  [pscustomobject]@{
    Subscription = "$($account.name) ($($account.id))"
    ResourceGroup = $outputs.resourceGroupName.value
    Location = $Location
    Registry = $registryLoginServer
    ApiUrl = $outputs.runtime.value.apiUrl
    DashboardUrl = $outputs.runtime.value.dashboardUrl
    ApiImage = $apiImage
    DashboardImage = $dashboardImage
    CampaignBlob = $campaignBlob
    CampaignSha256 = $checksum
  } | Format-List
}
finally {
  if (Test-Path -LiteralPath $temporaryDirectory) {
    Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force
  }
}
