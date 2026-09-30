$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$workspace = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$deploy = Join-Path $workspace 'scripts\deploy.ps1'
$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "lighthouse-deployment-test-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null
$global:deploymentTestCalls = [System.Collections.Generic.List[object]]::new()
$global:deploymentTestGitCalls = [System.Collections.Generic.List[object]]::new()
$global:deploymentTestPnpmCalls = [System.Collections.Generic.List[object]]::new()
$global:deploymentTestDescriptor = [System.Text.Encoding]::UTF8.GetBytes('{"fixture":"offline transport double"}')
$digest = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($global:deploymentTestDescriptor)).ToLowerInvariant()
$subscription = '11111111-1111-4111-8111-111111111111'
$tenant = '22222222-2222-4222-8222-222222222222'
$group = 'rg-camc-test'
$settingsPath = Join-Path $temporaryDirectory 'settings.json'
$manifestPath = Join-Path $temporaryDirectory 'release.json'
$publishedPath = Join-Path $temporaryDirectory 'published.json'
$settings = @{
  entraTenantId = $tenant
  entraApiClientId = '33333333-3333-4333-8333-333333333333'
  entraSpaClientId = '44444444-4444-4444-8444-444444444444'
  unitSigningSecretName = 'participant-signing'
  unitSigningSecretVersion = 'a' * 32
}
$manifest = @{
  schemaVersion = '1.0'; sourceCommit = 'a' * 40
  subscriptionId = $subscription; resourceGroupName = $group
  apiImage = "example.azurecr.io/mission-control-api@sha256:$('b' * 64)"
  dashboardImage = "example.azurecr.io/command-center@sha256:$('c' * 64)"
  campaignRuntimeBlobUrl = "https://example.blob.core.windows.net/campaigns/operation-lighthouse/1.0.0/$digest/runtime.json"
  campaignRuntimeSha256 = $digest
}
$global:deploymentTestFoundation = @{
  resourceGroupName = @{ value = $group }
  runtime = @{ value = @{
    mode = 'bootstrap'; registryLoginServer = 'example.azurecr.io'
    apiUrl = 'https://api.example.test'; dashboardUrl = 'https://dashboard.example.test'
  } }
  data = @{ value = @{ campaigns = @{
    storageAccountName = 'example'; containerName = 'campaigns'
    blobEndpoint = 'https://example.blob.core.windows.net/'
  } } }
}
$common = @{ SubscriptionId = $subscription; Location = 'canadaeast'; EnvironmentName = 'test'; Owner = 'test-team'; Force = $true }

function Assert-Test {
  param([bool] $Condition, [string] $Message)
  if (-not $Condition) { throw "Deployment regression: $Message" }
}

function Reset-Test {
  $global:deploymentTestCalls.Clear()
  $global:deploymentTestGitCalls.Clear()
  $global:deploymentTestPnpmCalls.Clear()
  $global:deploymentTestGroupExists = $false
  $global:deploymentTestDirty = $false
  $global:deploymentTestTamper = $false
  $global:deploymentTestPromotedRuntime = $null
  $settings | ConvertTo-Json | Set-Content -LiteralPath $settingsPath -Encoding utf8
  $manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding utf8
}

function Assert-NoAzureMutation {
  $mutations = @($global:deploymentTestCalls | Where-Object {
    ($_ -join ' ') -match '^(deployment sub create|acr build|acr import|storage blob upload|role assignment|ad app create)'
  })
  Assert-Test ($mutations.Count -eq 0) 'a rejected or preview-only stage mutated Azure'
}

# Every external command is intercepted. Unknown Azure commands fail, never fall through to the real CLI.
function az {
  $arguments = [string[]] $args
  $global:deploymentTestCalls.Add($arguments)
  $global:LASTEXITCODE = 0
  Assert-Test ($arguments -contains '--subscription') 'an Azure command omitted its explicit subscription'
  $command = ($arguments | Select-Object -First 3) -join ' '
  switch -Regex ($command) {
    '^account show ' { return (@{
      id = '11111111-1111-4111-8111-111111111111'; environmentName = 'AzureCloud'
      tenantId = '22222222-2222-4222-8222-222222222222'; user = @{ type = 'user' }
    } | ConvertTo-Json) }
    '^group exists ' { return $global:deploymentTestGroupExists.ToString().ToLowerInvariant() }
    '^group show ' { return (@{ location = 'canadaeast'; tags = @{ managedBy = 'bicep'; workload = 'camc'; environment = 'test' } } | ConvertTo-Json) }
    '^containerapp list ' { return '[{"properties":{"template":{"containers":[{"image":"example.azurecr.io/mission-control-api@sha256:existing"}]}}}]' }
    '^provider show ' { return 'Registered' }
    '^ad signed-in-user show$' { return '55555555-5555-4555-8555-555555555555' }
    '^deployment sub show$' { return ($global:deploymentTestFoundation | ConvertTo-Json -Depth 15) }
    '^deployment sub validate$' { return }
    '^deployment sub what-if$' { return '{"changes":[]}' }
    '^deployment sub create$' {
      $path = $arguments[[Array]::IndexOf($arguments, '--parameters') + 1].TrimStart('@')
      $global:deploymentTestPromotedRuntime = (Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable).parameters.runtimeConfiguration.value
      return (@{ runtime = @{ value = @{
        mode = $global:deploymentTestPromotedRuntime.mode
        apiUrl = 'https://api.example.test'; dashboardUrl = 'https://dashboard.example.test'
      } } } | ConvertTo-Json -Depth 10)
    }
    '^acr build ' { return }
    '^acr manifest show-metadata$' {
      $name = $arguments[[Array]::IndexOf($arguments, '--name') + 1]
      return $(if ($name.StartsWith('mission-control-api')) { "sha256:$('b' * 64)" } else { "sha256:$('c' * 64)" })
    }
    '^storage blob exists$' { return 'false' }
    '^storage blob upload$' { return }
    '^storage blob show$' { return (@{ properties = @{ contentLength = $global:deploymentTestDescriptor.Length; etag = '"test-etag"' } } | ConvertTo-Json) }
    '^storage blob download$' {
      $path = $arguments[[Array]::IndexOf($arguments, '--file') + 1]
      $bytes = if ($global:deploymentTestTamper) { [System.Text.Encoding]::UTF8.GetBytes('tampered') } else { $global:deploymentTestDescriptor }
      [System.IO.File]::WriteAllBytes($path, $bytes)
      return
    }
    default { throw "Unexpected Azure command in offline test: $command" }
  }
}

function git {
  $arguments = [string[]] $args
  $global:deploymentTestGitCalls.Add($arguments)
  $global:LASTEXITCODE = 0
  if ($arguments -contains 'rev-parse') { return ('a' * 40) }
  if ($arguments -contains 'status') { if ($global:deploymentTestDirty) { return ' M source.ts' }; return }
  if ($arguments -contains 'archive') {
    $archive = $arguments[[Array]::IndexOf($arguments, '--output') + 1]
    $marker = Join-Path (Split-Path -Parent $archive) 'snapshot-marker.txt'
    Set-Content -LiteralPath $marker -Value 'synthetic committed snapshot'
    Compress-Archive -LiteralPath $marker -DestinationPath $archive
    return
  }
  throw 'Unexpected git command in offline deployment test.'
}

function pnpm {
  $global:deploymentTestPnpmCalls.Add([string[]] $args)
  $global:LASTEXITCODE = 0
  if ($args[0] -eq 'install') { return }
  Assert-Test ($args[0] -eq 'build:hosted') 'unexpected package-manager invocation'
  $directory = Join-Path (Get-Location).Path 'campaigns\operation-lighthouse\dist'
  New-Item -ItemType Directory -Path $directory -Force | Out-Null
  [System.IO.File]::WriteAllBytes((Join-Path $directory 'runtime.json'), $global:deploymentTestDescriptor)
  $hash = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($global:deploymentTestDescriptor)).ToLowerInvariant()
  Set-Content -LiteralPath (Join-Path $directory 'runtime.sha256') -Value "$hash  runtime.json"
}

try {
  foreach ($invalid in @('missing-setting', 'secret-material', 'wrong-destination', 'mutable-image')) {
    Reset-Test
    switch ($invalid) {
      'missing-setting' {
        $bad = $settings.Clone(); $bad.Remove('entraApiClientId')
        $bad | ConvertTo-Json | Set-Content -LiteralPath $settingsPath
      }
      'secret-material' {
        $bad = $settings.Clone(); $bad.secretValue = 'synthetic-forbidden-input'
        $bad | ConvertTo-Json | Set-Content -LiteralPath $settingsPath
      }
      'wrong-destination' {
        $bad = $manifest.Clone(); $bad.resourceGroupName = 'rg-other'
        $bad | ConvertTo-Json | Set-Content -LiteralPath $manifestPath
      }
      'mutable-image' {
        $bad = $manifest.Clone(); $bad.apiImage = 'example.azurecr.io/mission-control-api:latest'
        $bad | ConvertTo-Json | Set-Content -LiteralPath $manifestPath
      }
    }
    $rejected = $false
    try { & $deploy @common -Stage Workshop -HostedSettingsPath $settingsPath -ReleaseManifestPath $manifestPath -PreviewOnly }
    catch { $rejected = $true }
    Assert-Test $rejected "$invalid was not rejected"
    Assert-Test ($global:deploymentTestCalls.Count -eq 0) "$invalid reached Azure"
  }

  Reset-Test
  $global:deploymentTestDirty = $true
  $rejected = $false
  try { & $deploy @common -Stage Artifacts -ReleaseManifestPath $publishedPath -PreviewOnly }
  catch { $rejected = $true }
  Assert-Test $rejected 'dirty worktree was allowed to publish'
  Assert-Test ($global:deploymentTestCalls.Count -eq 0) 'dirty source reached Azure'

  Reset-Test
  $global:deploymentTestGroupExists = $true
  $rejected = $false
  try { & $deploy @common -Stage Bootstrap }
  catch { $rejected = $_.Exception.Message -match 'Bootstrap would replace' }
  Assert-Test $rejected 'bootstrap did not protect the existing application'
  Assert-NoAzureMutation

  Reset-Test
  & $deploy @common -Stage Bootstrap -PreviewOnly
  Assert-NoAzureMutation
  Assert-Test (@($global:deploymentTestCalls | Where-Object { ($_ -join ' ') -match '^deployment sub what-if' }).Count -eq 1) 'bootstrap preview omitted what-if'

  Reset-Test
  & $deploy @common -Stage Artifacts -ReleaseManifestPath $publishedPath -PreviewOnly
  Assert-NoAzureMutation
  Assert-Test ($global:deploymentTestPnpmCalls.Count -eq 0) 'artifact preview executed a build'
  Assert-Test (-not (Test-Path -LiteralPath $publishedPath)) 'preview fabricated release evidence'

  Reset-Test
  & $deploy @common -Stage Artifacts -ReleaseManifestPath $publishedPath
  $published = Get-Content -LiteralPath $publishedPath -Raw | ConvertFrom-Json
  Assert-Test ($published.apiImage -eq $manifest.apiImage -and $published.dashboardImage -eq $manifest.dashboardImage) 'published images were not pinned'
  Assert-Test ($published.campaignRuntimeSha256 -eq $digest) 'published descriptor was not verified'
  $builds = @($global:deploymentTestCalls | Where-Object { ($_ -join ' ') -match '^acr build ' })
  Assert-Test ($builds.Count -eq 2) 'publication did not build both applications'
  foreach ($build in $builds) {
    $source = $build[[Array]::IndexOf($build, '--subscription') - 1]
    Assert-Test ($source -ne $workspace -and $source.EndsWith('source')) 'publication sent the live worktree instead of its snapshot'
    Assert-Test ($build -contains 'linux/amd64') 'image platform was not explicit'
  }
  Assert-Test (@($global:deploymentTestGitCalls | Where-Object { $_ -contains 'archive' }).Count -eq 1) 'publication omitted the committed source snapshot'
  Assert-Test ($null -eq $global:deploymentTestPromotedRuntime) 'artifact publication changed Container Apps'

  Reset-Test
  & $deploy @common -Stage Workshop -HostedSettingsPath $settingsPath -ReleaseManifestPath $manifestPath -PreviewOnly
  Assert-NoAzureMutation

  Reset-Test
  $global:deploymentTestTamper = $true
  $rejected = $false
  try { & $deploy @common -Stage Workshop -HostedSettingsPath $settingsPath -ReleaseManifestPath $manifestPath }
  catch { $rejected = $_.Exception.Message -match 'descriptor does not match' }
  Assert-Test $rejected 'a corrupted remote descriptor was promoted'
  Assert-NoAzureMutation

  Reset-Test
  & $deploy @common -Stage Workshop -HostedSettingsPath $settingsPath -ReleaseManifestPath $manifestPath
  Assert-Test ($global:deploymentTestPromotedRuntime.mode -eq 'workshop') 'hosted profile was not promoted'
  Assert-Test ($global:deploymentTestPromotedRuntime.dashboardOrigin -eq 'https://dashboard.example.test') 'dashboard origin was not resolved before promotion'
  Assert-Test ($global:deploymentTestPromotedRuntime.unitSigningSecretVersion -eq $settings.unitSigningSecretVersion) 'signing version changed during promotion'
  Assert-Test (@($global:deploymentTestCalls | Where-Object { ($_ -join ' ') -match '^(acr build|storage blob upload)' }).Count -eq 0) 'promotion rebuilt or replaced release artifacts'
  Write-Host 'Deployment orchestration: 12 offline scenarios passed; no real Azure commands executed.'
}
finally {
  Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force
}
