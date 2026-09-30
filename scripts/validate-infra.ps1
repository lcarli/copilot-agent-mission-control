[CmdletBinding()]
param(
  [string] $SubscriptionId = '4e4f76f7-bfb7-4163-84bd-2a19561451b5',
  [string] $Location = 'canadaeast',
  [string] $EnvironmentName = 'dev',
  [string] $WorkloadName = 'camc',
  [string] $ResourceGroupName,
  [switch] $Offline
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ($Offline -and -not [string]::IsNullOrWhiteSpace($ResourceGroupName)) {
  throw 'Offline validation cannot inspect a deployed resource group. Omit ResourceGroupName.'
}

$workspace = Split-Path -Parent $PSScriptRoot
$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "mission-control-infra-$([guid]::NewGuid())"
$results = [System.Collections.Generic.List[object]]::new()

function Add-Result {
  param(
    [Parameter(Mandatory)][string] $Check,
    [Parameter(Mandatory)][ValidateSet('PASS', 'FAIL', 'SKIP')][string] $Status,
    [Parameter(Mandatory)][string] $Detail
  )

  $script:results.Add([pscustomobject]@{
    Check = $Check
    Status = $Status
    Detail = $Detail
  })
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

function Assert-Match {
  param(
    [Parameter(Mandatory)][string] $Check,
    [Parameter(Mandatory)][string] $Text,
    [Parameter(Mandatory)][string] $Pattern,
    [int] $MinimumCount = 1
  )

  $count = ([regex]::Matches($Text, $Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
  if ($count -ge $MinimumCount) {
    Add-Result -Check $Check -Status PASS -Detail "Found $count required occurrence(s)."
  }
  else {
    Add-Result -Check $Check -Status FAIL -Detail "Expected at least $MinimumCount occurrence(s), found $count."
  }
}

function Assert-NoMatch {
  param(
    [Parameter(Mandatory)][string] $Check,
    [Parameter(Mandatory)][string] $Text,
    [Parameter(Mandatory)][string] $Pattern
  )

  if ($Text -notmatch $Pattern) {
    Add-Result -Check $Check -Status PASS -Detail 'Forbidden pattern is absent.'
  }
  else {
    Add-Result -Check $Check -Status FAIL -Detail "Forbidden pattern matched: $Pattern"
  }
}

function ConvertFrom-AzureJson {
  param([Parameter(Mandatory)][string] $Text)

  $objectStart = $Text.IndexOf('{')
  $arrayStart = $Text.IndexOf('[')
  $starts = @($objectStart, $arrayStart) | Where-Object { $_ -ge 0 }
  if ($starts.Count -eq 0) {
    throw 'Azure CLI output did not contain a JSON object or array.'
  }

  return $Text.Substring(($starts | Measure-Object -Minimum).Minimum) | ConvertFrom-Json
}

function Test-HttpEndpoint {
  param(
    [Parameter(Mandatory)][string] $Check,
    [Parameter(Mandatory)][string] $Uri
  )

  try {
    $response = Invoke-WebRequest -Uri $Uri -Method Get -TimeoutSec 30 -MaximumRedirection 5
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
      Add-Result -Check $Check -Status PASS -Detail "$Uri returned HTTP $($response.StatusCode)."
    }
    else {
      Add-Result -Check $Check -Status FAIL -Detail "$Uri returned HTTP $($response.StatusCode)."
    }
  }
  catch {
    Add-Result -Check $Check -Status FAIL -Detail $_.Exception.Message
  }
}

function Get-TemplateResources {
  param([object] $Template)
  $resources = if ($Template.resources -is [array]) { $Template.resources } else { $Template.resources.PSObject.Properties.Value }
  foreach ($resource in $resources) {
    $resource
    if ($resource.type -eq 'Microsoft.Resources/deployments') {
      Get-TemplateResources $resource.properties.template
    }
  }
}

if (-not (Get-Command 'az' -ErrorAction SilentlyContinue)) {
  throw "Required command 'az' was not found on PATH."
}

New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null

try {
  $mainTemplate = Join-Path $workspace 'infra\main.bicep'
  $deployTemplate = Join-Path $workspace 'infra\deploy.bicep'
  $mainJson = Join-Path $temporaryDirectory 'main.json'
  $deployJson = Join-Path $temporaryDirectory 'deploy.json'
  $mainParameters = Join-Path $temporaryDirectory 'main.parameters.json'
  $deployParameters = Join-Path $temporaryDirectory 'deploy.parameters.json'
  $buildReady = $true

  try {
    Invoke-AzureCli -Arguments @('bicep', 'lint', '--file', $mainTemplate) -AllowEmpty | Out-Null
    Invoke-AzureCli -Arguments @('bicep', 'lint', '--file', $deployTemplate) -AllowEmpty | Out-Null
    Add-Result -Check 'Bicep lint' -Status PASS -Detail 'Both entrypoints lint cleanly.'
  }
  catch {
    $buildReady = $false
    Add-Result -Check 'Bicep lint' -Status FAIL -Detail $_.Exception.Message
  }

  try {
    Invoke-AzureCli -Arguments @('bicep', 'build', '--file', $mainTemplate, '--outfile', $mainJson) -AllowEmpty |
      Out-Null
    Invoke-AzureCli -Arguments @('bicep', 'build', '--file', $deployTemplate, '--outfile', $deployJson) -AllowEmpty |
      Out-Null
    Invoke-AzureCli -Arguments @(
      'bicep', 'build-params',
      '--file', (Join-Path $workspace 'infra\main.bicepparam'),
      '--outfile', $mainParameters
    ) -AllowEmpty | Out-Null
    Invoke-AzureCli -Arguments @(
      'bicep', 'build-params', '--file', (Join-Path $workspace 'infra\workshop.bicepparam'),
      '--outfile', (Join-Path $temporaryDirectory 'workshop.parameters.json')
    ) -AllowEmpty | Out-Null
    Invoke-AzureCli -Arguments @(
      'bicep', 'build-params',
      '--file', (Join-Path $workspace 'infra\deploy.bicepparam'),
      '--outfile', $deployParameters
    ) -AllowEmpty | Out-Null
    Add-Result -Check 'Bicep build' -Status PASS -Detail 'Templates and parameter files compile.'
  }
  catch {
    $buildReady = $false
    Add-Result -Check 'Bicep build' -Status FAIL -Detail $_.Exception.Message
  }

  if ($buildReady) {
    $compiledTemplate = Get-Content -LiteralPath $mainJson -Raw
    Assert-Match -Check 'ACR admin disabled' -Text $compiledTemplate -Pattern '"adminUserEnabled"\s*:\s*false'
    Assert-Match -Check 'Storage Shared Key disabled' -Text $compiledTemplate -Pattern '"allowSharedKeyAccess"\s*:\s*false'
    Assert-Match -Check 'Blob public access disabled' -Text $compiledTemplate -Pattern '"allowBlobPublicAccess"\s*:\s*false'
    Assert-Match -Check 'Campaign container private' -Text $compiledTemplate -Pattern '"publicAccess"\s*:\s*"None"'
    Assert-Match -Check 'Service local auth disabled' -Text $compiledTemplate -Pattern '"disableLocalAuth"\s*:\s*true' -MinimumCount 2
    Assert-Match -Check 'Key Vault RBAC enabled' -Text $compiledTemplate -Pattern '"enableRbacAuthorization"\s*:\s*true'
    Assert-Match -Check 'HTTPS-only ingress' -Text $compiledTemplate -Pattern '"allowInsecure"\s*:\s*false' -MinimumCount 2
    Assert-NoMatch -Check 'No Owner role assignment' -Text $compiledTemplate -Pattern '8e3af657-a8ff-443c-a75c-2fe8c4bcb635'
    Assert-NoMatch -Check 'No generic Contributor assignment' -Text $compiledTemplate -Pattern 'b24988ac-6180-42a0-ab88-20f7382dd24c'
    Assert-NoMatch -Check 'No SQL administrator password' -Text $compiledTemplate -Pattern 'administratorLoginPassword'
    Assert-Match -Check 'SignalR Serverless profile' -Text $compiledTemplate -Pattern '"value"\s*:\s*"Serverless"'
    Assert-Match -Check 'SignalR REST role' -Text $compiledTemplate -Pattern 'fd53cd77-2268-407a-8f46-7e7863d0f521'
    Assert-NoMatch -Check 'No Default-mode App Server role' -Text $compiledTemplate -Pattern '420fcaa2-552c-430f-98ca-3264be4806c7'
    Assert-Match -Check 'Campaign read-only runtime role' -Text $compiledTemplate -Pattern '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'
    Assert-Match -Check 'API operational health probes' -Text $compiledTemplate -Pattern '/api/v1/health/(live|ready)' -MinimumCount 3
    Assert-Match -Check 'Dashboard operational health probes' -Text $compiledTemplate -Pattern "'/health/(live|ready)'" -MinimumCount 3
    $resources = @(Get-TemplateResources ($compiledTemplate | ConvertFrom-Json))
    $api = @($resources | Where-Object { $_.type -eq 'Microsoft.App/containerApps' -and $_.properties.template.containers[0].name -eq 'mission-control-api' })
    if ($api.Count -eq 1 -and $api[0].properties.template.scale.minReplicas -eq 1 -and $api[0].properties.template.scale.maxReplicas -eq 1) {
      Add-Result -Check 'Bounded API replica count' -Status PASS -Detail 'Exactly one API replica is configured.'
    } else { Add-Result -Check 'Bounded API replica count' -Status FAIL -Detail 'The API must have minReplicas=maxReplicas=1.' }

    $negativeDirectory = Join-Path $temporaryDirectory 'negative-infra'
    Copy-Item -LiteralPath (Join-Path $workspace 'infra') -Destination $negativeDirectory -Recurse
    $example = Get-Content -LiteralPath (Join-Path $negativeDirectory 'workshop.bicepparam') -Raw
    foreach ($required in @('apiImage', 'unitSigningSecretVersion')) {
      $invalid = [regex]::Replace($example, "(?m)^\s*${required}:.*\r?\n", '')
      $invalidPath = Join-Path $negativeDirectory "missing-$required.bicepparam"
      Set-Content -LiteralPath $invalidPath -Value $invalid -Encoding utf8
      $failure = & az bicep build-params --file $invalidPath --outfile (Join-Path $temporaryDirectory "invalid-$required.json") 2>&1
      if ($LASTEXITCODE -ne 0 -and ($failure -join ' ') -match $required) {
        Add-Result -Check "Hosted requires $required" -Status PASS -Detail 'The incomplete workshop profile is rejected at compilation.'
      } else {
        Add-Result -Check "Hosted requires $required" -Status FAIL -Detail 'Missing hosted configuration was not rejected for the expected reason.'
      }
    }
  }
  else {
    Add-Result -Check 'Static security assertions' -Status SKIP -Detail 'Skipped because Bicep compilation failed.'
  }

  try {
    & pwsh -NoProfile -File (Join-Path $workspace 'tests\infra\deployment.test.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Offline deployment orchestration scenarios failed.' }
    Add-Result -Check 'Deployment orchestration' -Status PASS -Detail '12 offline scenarios cover stage separation, source snapshots, immutable artifacts and rejection gates.'
  } catch {
    Add-Result -Check 'Deployment orchestration' -Status FAIL -Detail $_.Exception.Message
  }

  if ($Offline) {
    Add-Result -Check 'Azure ARM preflight' -Status SKIP -Detail 'Offline mode requested.'
  }
  else {
    try {
      Invoke-AzureCli -Arguments @('account', 'set', '--subscription', $SubscriptionId) -AllowEmpty | Out-Null
      Invoke-AzureCli -Arguments @(
        'deployment', 'sub', 'validate',
        '--location', $Location,
        '--template-file', $deployTemplate,
        '--parameters', "@$deployParameters",
        '--output', 'none'
      ) -AllowEmpty | Out-Null
      Add-Result -Check 'ARM validation' -Status PASS -Detail "Subscription template validated in $Location."
    }
    catch {
      Add-Result -Check 'ARM validation' -Status FAIL -Detail $_.Exception.Message
    }

    try {
      $whatIfText = Invoke-AzureCli -Arguments @(
        'deployment', 'sub', 'what-if',
        '--location', $Location,
        '--template-file', $deployTemplate,
        '--parameters', "@$deployParameters",
        '--result-format', 'ResourceIdOnly',
        '--no-pretty-print',
        '--output', 'json'
      )
      $whatIf = ConvertFrom-AzureJson -Text $whatIfText
      $deletes = @($whatIf.changes | Where-Object changeType -eq 'Delete').Count
      if ($deletes -eq 0) {
        Add-Result -Check 'ARM what-if' -Status PASS -Detail "$(@($whatIf.changes).Count) change(s), no deletes."
      }
      else {
        Add-Result -Check 'ARM what-if' -Status FAIL -Detail "$deletes unexpected delete change(s)."
      }
    }
    catch {
      Add-Result -Check 'ARM what-if' -Status FAIL -Detail $_.Exception.Message
    }
  }

  if ([string]::IsNullOrWhiteSpace($ResourceGroupName)) {
    Add-Result -Check 'Deployed environment smoke' -Status SKIP -Detail 'No ResourceGroupName supplied.'
  }
  else {
    try {
      $resourceGroup = Invoke-AzureCli -Arguments @(
        'group', 'show',
        '--name', $ResourceGroupName,
        '--output', 'json'
      ) | ConvertFrom-Json
      if (
        $resourceGroup.tags.managedBy -ne 'bicep' -or
        $resourceGroup.tags.workload -ne $WorkloadName -or
        $resourceGroup.tags.environment -ne $EnvironmentName
      ) {
        throw 'Resource group ownership tags do not match the requested environment.'
      }

      $outputs = Invoke-AzureCli -Arguments @(
        'deployment', 'sub', 'show',
        '--name', "mission-control-$EnvironmentName",
        '--query', 'properties.outputs',
        '--output', 'json'
      ) | ConvertFrom-Json
      if ($outputs.runtime.value.PSObject.Properties.Name -notcontains 'mode' -or $outputs.runtime.value.mode -ne 'workshop') {
        throw 'Bootstrap or legacy foundation outputs are not operational workshop evidence.'
      }
      Add-Result -Check 'Environment ownership' -Status PASS -Detail $resourceGroup.id

      $registry = Invoke-AzureCli -Arguments @(
        'acr', 'show',
        '--name', $outputs.names.value.containerRegistry,
        '--resource-group', $ResourceGroupName,
        '--output', 'json'
      ) | ConvertFrom-Json
      if ($registry.adminUserEnabled) {
        Add-Result -Check 'Live ACR security' -Status FAIL -Detail 'ACR admin user is enabled.'
      }
      else {
        Add-Result -Check 'Live ACR security' -Status PASS -Detail 'ACR admin user is disabled.'
      }

      foreach ($appName in @(
        $outputs.names.value.missionControlApiContainerApp,
        $outputs.names.value.dashboardContainerApp
      )) {
        $app = Invoke-AzureCli -Arguments @(
          'containerapp', 'show',
          '--name', $appName,
          '--resource-group', $ResourceGroupName,
          '--output', 'json'
        ) | ConvertFrom-Json
        if (
          $app.properties.provisioningState -ne 'Succeeded' -or
          $app.identity.type -notmatch 'UserAssigned' -or
          $app.properties.configuration.ingress.allowInsecure
        ) {
          Add-Result -Check "Container App $appName" -Status FAIL -Detail 'Provisioning, identity, or HTTPS invariant failed.'
        }
        else {
          Add-Result -Check "Container App $appName" -Status PASS -Detail 'Succeeded with user identity and HTTPS-only ingress.'
        }
        if ($appName -eq $outputs.names.value.missionControlApiContainerApp) {
          if ($app.properties.template.scale.minReplicas -ne 1 -or $app.properties.template.scale.maxReplicas -ne 1) {
            throw 'The deployed API is not the bounded single-replica profile.'
          }
          $apiEnvironment = @{}
          foreach ($variable in $app.properties.template.containers[0].env) {
            if ($variable.PSObject.Properties.Name -contains 'value') { $apiEnvironment[$variable.name] = $variable.value }
          }
        }
      }

      $storage = Invoke-AzureCli -Arguments @(
        'storage', 'account', 'show',
        '--name', $outputs.data.value.campaigns.storageAccountName,
        '--resource-group', $ResourceGroupName,
        '--output', 'json'
      ) | ConvertFrom-Json
      if ($storage.allowSharedKeyAccess -or $storage.allowBlobPublicAccess) {
        Add-Result -Check 'Live Storage security' -Status FAIL -Detail 'Shared Key or public Blob access is enabled.'
      }
      else {
        Add-Result -Check 'Live Storage security' -Status PASS -Detail 'Shared Key and public Blob access are disabled.'
      }

      $containerId = "$($storage.id)/blobServices/default/containers/$($outputs.data.value.campaigns.containerName)"
      $container = Invoke-AzureCli -Arguments @(
        'rest',
        '--method', 'get',
        '--url', "https://management.azure.com$containerId?api-version=2023-05-01",
        '--output', 'json'
      ) | ConvertFrom-Json
      if ($container.properties.publicAccess -eq 'None') {
        Add-Result -Check 'Live campaign privacy' -Status PASS -Detail 'Campaign container is private.'
      }
      else {
        Add-Result -Check 'Live campaign privacy' -Status FAIL -Detail "publicAccess=$($container.properties.publicAccess)"
      }

      $blobPrefix = "$($outputs.data.value.campaigns.blobEndpoint.TrimEnd('/'))/$($outputs.data.value.campaigns.containerName)/"
      $digest = $apiEnvironment['CAMPAIGN_RUNTIME_SHA256']
      $blobUrl = $apiEnvironment['CAMPAIGN_RUNTIME_BLOB_URL']
      if ($digest -cnotmatch '^[0-9a-f]{64}$' -or $blobUrl -cne "${blobPrefix}operation-lighthouse/1.0.0/$digest/runtime.json") {
        throw 'The API does not reference its checksum-addressed campaign descriptor.'
      }
      $blob = $blobUrl.Substring($blobPrefix.Length)
      $blobArguments = @('--auth-mode', 'login', '--account-name', $outputs.data.value.campaigns.storageAccountName,
        '--container-name', $outputs.data.value.campaigns.containerName, '--name', $blob)
      $metadata = Invoke-AzureCli -Arguments (@('storage', 'blob', 'show') + $blobArguments + @('--output', 'json')) | ConvertFrom-Json
      if ($metadata.properties.contentLength -lt 1 -or $metadata.properties.contentLength -gt 1000000) { throw 'Campaign descriptor length is invalid.' }
      $download = Join-Path $temporaryDirectory 'runtime.json'
      Invoke-AzureCli -Arguments (@('storage', 'blob', 'download') + $blobArguments +
        @('--file', $download, '--if-match', $metadata.properties.etag, '--output', 'none')) -AllowEmpty | Out-Null
      if ((Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash.ToLowerInvariant() -cne $digest) { throw 'Live campaign descriptor digest does not match.' }
      Add-Result -Check 'Campaign runtime artifact' -Status PASS -Detail 'Exact configured descriptor downloaded conditionally and verified by SHA-256.'

      $runtime = Invoke-RestMethod -Uri "$($outputs.runtime.value.apiUrl)/api/v1/workshop" -TimeoutSec 15
      if ($runtime.mode -ne 'hosted' -or $runtime.persistence -ne 'cosmos' -or $runtime.transport -ne 'signalr') {
        throw 'The public runtime metadata does not describe the hosted implementation.'
      }
      $signalR = Invoke-AzureCli -Arguments @('signalr', 'show', '--name', $outputs.realtime.value.name,
        '--resource-group', $ResourceGroupName, '--output', 'json') | ConvertFrom-Json
      $mode = @($signalR.features | Where-Object flag -eq 'ServiceMode')
      if ($mode.Count -ne 1 -or $mode[0].value -ne 'Serverless' -or -not $signalR.disableLocalAuth -or
          @($signalR.cors.allowedOrigins).Count -ne 1 -or $signalR.cors.allowedOrigins[0] -cne $outputs.runtime.value.dashboardUrl) {
        throw 'Live SignalR mode, authentication or dashboard CORS differs from the hosted profile.'
      }
      Add-Result -Check 'Live SignalR configuration' -Status PASS -Detail 'Serverless, local auth disabled and exact dashboard CORS. Actual client-token/publication permission remains a rehearsal gate.'
      Test-HttpEndpoint -Check 'API readiness smoke' -Uri "$($outputs.runtime.value.apiUrl)/api/v1/health/ready"
      Test-HttpEndpoint -Check 'Event transport smoke' -Uri "$($outputs.runtime.value.apiUrl)/api/v1/health/event"
      Test-HttpEndpoint -Check 'Dashboard HTTPS smoke' -Uri $outputs.runtime.value.dashboardUrl
      Test-HttpEndpoint -Check 'Dashboard proxy smoke' -Uri "$($outputs.runtime.value.dashboardUrl)/api/v1/workshop"
      Test-HttpEndpoint -Check 'Dashboard auth bridge smoke' -Uri "$($outputs.runtime.value.dashboardUrl)/auth.html"
    }
    catch {
      Add-Result -Check 'Deployed environment smoke' -Status FAIL -Detail $_.Exception.Message
    }
  }
}
finally {
  if (Test-Path -LiteralPath $temporaryDirectory) {
    Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force
  }
}

$results | Format-Table Check, Status, Detail -AutoSize -Wrap
$failures = @($results | Where-Object Status -eq 'FAIL')
if ($failures.Count -gt 0) {
  throw "Infrastructure validation failed: $($failures.Count) check(s) failed."
}

Write-Host "Infrastructure validation passed: $(@($results | Where-Object Status -eq 'PASS').Count) checks."
