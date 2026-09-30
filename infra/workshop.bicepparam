using './deploy.bicep'

// Offline compilation example only. These are synthetic identifiers, not a deployment destination.
param resourceGroupName = 'rg-camc-workshop'
param location = 'canadaeast'
param environmentName = 'workshop'
param owner = 'mission-control-team'
param keyVaultPurgeProtectionEnabled = true
param runtimeConfiguration = {
  mode: 'workshop'
  apiImage: 'example.azurecr.io/mission-control-api@sha256:0000000000000000000000000000000000000000000000000000000000000000'
  dashboardImage: 'example.azurecr.io/command-center@sha256:0000000000000000000000000000000000000000000000000000000000000000'
  entraTenantId: '11111111-1111-4111-8111-111111111111'
  entraApiClientId: '22222222-2222-4222-8222-222222222222'
  entraSpaClientId: '33333333-3333-4333-8333-333333333333'
  dashboardOrigin: 'https://dashboard.example.test'
  unitSigningSecretName: 'participant-signing'
  unitSigningSecretVersion: '00000000000000000000000000000000'
  campaignRuntimeBlobUrl: 'https://example.blob.core.windows.net/campaigns/operation-lighthouse/1.0.0/0000000000000000000000000000000000000000000000000000000000000000/runtime.json'
  campaignRuntimeSha256: '0000000000000000000000000000000000000000000000000000000000000000'
}
