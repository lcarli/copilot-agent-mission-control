[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string] $ResourceGroupName,
  [Parameter(Mandatory)]
  [string] $EnvironmentName,
  [string] $WorkloadName = 'camc',
  [string] $SubscriptionId = '4e4f76f7-bfb7-4163-84bd-2a19561451b5',
  [string] $ExpectedLocation = 'canadaeast',
  [int] $TimeoutMinutes = 30,
  [switch] $PreviewOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

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

function Get-RequiredTag {
  param(
    [Parameter(Mandatory)][object] $Tags,
    [Parameter(Mandatory)][string] $Name
  )

  $property = $Tags.PSObject.Properties[$Name]
  if ($null -eq $property -or [string]::IsNullOrWhiteSpace([string] $property.Value)) {
    throw "Resource group '$ResourceGroupName' is missing required ownership tag '$Name'."
  }

  return [string] $property.Value
}

if (-not (Get-Command 'az' -ErrorAction SilentlyContinue)) {
  throw "Required command 'az' was not found on PATH."
}
if ($TimeoutMinutes -lt 1 -or $TimeoutMinutes -gt 120) {
  throw 'TimeoutMinutes must be between 1 and 120.'
}
if ($ResourceGroupName -match '[*?/\[\]]' -or $ResourceGroupName -notmatch '^[A-Za-z0-9._()-]+$') {
  throw 'ResourceGroupName must be one exact Azure resource-group name without wildcard or path characters.'
}
if ($EnvironmentName -notmatch '^[a-z0-9-]{2,8}$') {
  throw 'EnvironmentName must contain 2-8 lowercase letters, numbers, or hyphens.'
}
if ($WorkloadName -notmatch '^[a-z0-9-]{2,12}$') {
  throw 'WorkloadName must contain 2-12 lowercase letters, numbers, or hyphens.'
}

Invoke-AzureCli -Arguments @('account', 'set', '--subscription', $SubscriptionId) -AllowEmpty | Out-Null
$account = Invoke-AzureCli -Arguments @(
  'account', 'show',
  '--query', '{id:id,name:name,tenantId:tenantId}',
  '--output', 'json'
) | ConvertFrom-Json

$exists = Invoke-AzureCli -Arguments @(
  'group', 'exists',
  '--name', $ResourceGroupName,
  '--output', 'tsv'
)
if ($exists -ne 'true') {
  Write-Host "Resource group '$ResourceGroupName' does not exist in subscription '$($account.name)'. Nothing to delete."
  return
}

$resourceGroup = Invoke-AzureCli -Arguments @(
  'group', 'show',
  '--name', $ResourceGroupName,
  '--output', 'json'
) | ConvertFrom-Json

if ($resourceGroup.id -ne "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName") {
  throw "Resolved resource-group ID '$($resourceGroup.id)' does not match the requested exact scope."
}
if ($resourceGroup.location -ne $ExpectedLocation) {
  throw "Resource group location '$($resourceGroup.location)' does not match expected location '$ExpectedLocation'."
}
$managedBy = Get-RequiredTag -Tags $resourceGroup.tags -Name 'managedBy'
$actualWorkload = Get-RequiredTag -Tags $resourceGroup.tags -Name 'workload'
$actualEnvironment = Get-RequiredTag -Tags $resourceGroup.tags -Name 'environment'
$owner = Get-RequiredTag -Tags $resourceGroup.tags -Name 'owner'

if ($managedBy -ne 'bicep') {
  throw "Resource group '$ResourceGroupName' is not tagged managedBy=bicep."
}
if ($actualWorkload -ne $WorkloadName) {
  throw "Resource group workload tag '$actualWorkload' does not match '$WorkloadName'."
}
if ($actualEnvironment -ne $EnvironmentName) {
  throw "Resource group environment tag '$actualEnvironment' does not match '$EnvironmentName'."
}

$resources = Invoke-AzureCli -Arguments @(
  'resource', 'list',
  '--resource-group', $ResourceGroupName,
  '--query', '[].{Name:name,Type:type,Location:location,Id:id}',
  '--output', 'json'
) | ConvertFrom-Json
$locks = Invoke-AzureCli -Arguments @(
  'lock', 'list',
  '--resource-group', $ResourceGroupName,
  '--query', '[].{Name:name,Level:level,Scope:id,Notes:notes}',
  '--output', 'json'
) | ConvertFrom-Json
$vaults = Invoke-AzureCli -Arguments @(
  'keyvault', 'list',
  '--resource-group', $ResourceGroupName,
  '--query', '[].{Name:name,PurgeProtection:properties.enablePurgeProtection,RetentionDays:properties.softDeleteRetentionInDays}',
  '--output', 'json'
) | ConvertFrom-Json

Write-Host "`nDeletion target"
[pscustomobject]@{
  Subscription = "$($account.name) ($($account.id))"
  ResourceGroup = $resourceGroup.name
  ResourceId = $resourceGroup.id
  Location = $resourceGroup.location
  Workload = $actualWorkload
  Environment = $actualEnvironment
  Owner = $owner
  ResourceCount = @($resources).Count
} | Format-List

Write-Host 'Resources in the exact deletion scope:'
if (@($resources).Count -eq 0) {
  Write-Host '(none)'
}
else {
  $resources | Sort-Object Type, Name | Format-Table Name, Type, Location -AutoSize
}

if (@($vaults).Count -gt 0) {
  Write-Host 'Key Vault recovery state after resource-group deletion:'
  $vaults | Format-Table Name, PurgeProtection, RetentionDays -AutoSize
  Write-Warning 'Key Vault soft-deleted data is never purged by this script.'
}

if (@($locks).Count -gt 0) {
  Write-Host 'Deletion locks block cleanup:'
  $locks | Format-Table Name, Level, Scope, Notes -AutoSize
  throw 'Remove the listed locks explicitly, then run the cleanup command again.'
}

if ($PreviewOnly) {
  Write-Host 'Preview completed; no Azure resources were deleted.'
  return
}

$requiredConfirmation = "delete $ResourceGroupName"
$confirmation = Read-Host "Type '$requiredConfirmation' to permanently delete this exact resource group"
if ($confirmation -cne $requiredConfirmation) {
  throw 'Deletion cancelled because the confirmation phrase did not match exactly.'
}

Invoke-AzureCli -Arguments @(
  'group', 'delete',
  '--name', $ResourceGroupName,
  '--yes',
  '--no-wait',
  '--output', 'none'
) -AllowEmpty | Out-Null

$deadline = [DateTimeOffset]::UtcNow.AddMinutes($TimeoutMinutes)
do {
  Start-Sleep -Seconds 15
  $exists = Invoke-AzureCli -Arguments @(
    'group', 'exists',
    '--name', $ResourceGroupName,
    '--output', 'tsv'
  )
  if ($exists -eq 'false') {
    Write-Host "Resource group '$ResourceGroupName' was deleted successfully."
    if (@($vaults | Where-Object PurgeProtection).Count -gt 0) {
      Write-Warning 'Purge-protected Key Vault data remains recoverable until its retention period expires.'
    }
    return
  }
}
while ([DateTimeOffset]::UtcNow -lt $deadline)

throw "Deletion is still in progress after $TimeoutMinutes minutes. Check 'az group show --name $ResourceGroupName'."
