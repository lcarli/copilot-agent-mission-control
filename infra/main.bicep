targetScope = 'resourceGroup'

metadata description = 'Resource-group-scoped foundation for Copilot Agent Mission Control.'

@description('Short workload identifier. Use lowercase letters, numbers, and hyphens.')
@minLength(2)
@maxLength(12)
param workloadName string = 'camc'

@description('Short environment identifier, such as dev, test, or prod.')
@minLength(2)
@maxLength(8)
param environmentName string

@description('Azure region used by regional resources.')
param location string = resourceGroup().location

@description('Team or person responsible for the deployed environment.')
@minLength(1)
param owner string

@description('Additional non-sensitive tags. Required platform tags take precedence.')
param additionalTags object = {}

@description('Log Analytics retention in days.')
@minValue(30)
@maxValue(730)
param logRetentionInDays int = 30

@description('Log Analytics daily ingestion cap in GB.')
@minValue(1)
@maxValue(1000)
param logDailyQuotaGb int = 1

@description('Number of days soft-deleted Key Vault objects are retained.')
@minValue(7)
@maxValue(90)
param keyVaultSoftDeleteRetentionInDays int = 7

@description('Protect the Key Vault from purge during the soft-delete retention period.')
param keyVaultPurgeProtectionEnabled bool = true

@description('Storage redundancy SKU for campaign packages.')
@allowed([
  'Standard_LRS'
  'Standard_ZRS'
])
param storageSku string = 'Standard_LRS'

@description('Blob and container soft-delete retention in days.')
@minValue(1)
@maxValue(365)
param blobDeleteRetentionInDays int = 7

module naming './modules/naming.bicep' = {
  name: 'mission-control-naming'
  params: {
    environmentName: environmentName
    location: location
    workloadName: workloadName
  }
}

module tagging './modules/tags.bicep' = {
  name: 'mission-control-tags'
  params: {
    additionalTags: additionalTags
    environmentName: environmentName
    owner: owner
    workloadName: workloadName
  }
}

module dataStorage './modules/data-storage.bicep' = {
  name: 'mission-control-data-storage'
  params: {
    apiPrincipalId: identitySecrets.outputs.apiIdentityPrincipalId
    blobDeleteRetentionInDays: blobDeleteRetentionInDays
    location: location
    names: naming.outputs.names
    storageSku: storageSku
    tags: tagging.outputs.tags
  }
}

module identitySecrets './modules/identity-secrets.bicep' = {
  name: 'mission-control-identity-secrets'
  params: {
    location: location
    names: naming.outputs.names
    purgeProtectionEnabled: keyVaultPurgeProtectionEnabled
    softDeleteRetentionInDays: keyVaultSoftDeleteRetentionInDays
    tags: tagging.outputs.tags
  }
}

module monitoring './modules/monitoring.bicep' = {
  name: 'mission-control-monitoring'
  params: {
    dailyQuotaGb: logDailyQuotaGb
    location: location
    names: naming.outputs.names
    retentionInDays: logRetentionInDays
    tags: tagging.outputs.tags
  }
}

module realtime './modules/realtime.bicep' = {
  name: 'mission-control-realtime'
  params: {
    apiPrincipalId: identitySecrets.outputs.apiIdentityPrincipalId
    location: location
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
    names: naming.outputs.names
    tags: tagging.outputs.tags
  }
}

output data object = {
  campaigns: {
    blobEndpoint: dataStorage.outputs.storageBlobEndpoint
    containerName: dataStorage.outputs.campaignContainerName
    storageAccountId: dataStorage.outputs.storageAccountId
    storageAccountName: dataStorage.outputs.storageAccountName
  }
  cosmos: {
    accountId: dataStorage.outputs.cosmosAccountId
    databaseName: dataStorage.outputs.cosmosDatabaseName
    endpoint: dataStorage.outputs.cosmosEndpoint
    eventsContainerName: dataStorage.outputs.eventsContainerName
    stateContainerName: dataStorage.outputs.stateContainerName
  }
}
output identity object = {
  api: {
    clientId: identitySecrets.outputs.apiIdentityClientId
    principalId: identitySecrets.outputs.apiIdentityPrincipalId
    resourceId: identitySecrets.outputs.apiIdentityId
  }
  dashboard: {
    clientId: identitySecrets.outputs.dashboardIdentityClientId
    principalId: identitySecrets.outputs.dashboardIdentityPrincipalId
    resourceId: identitySecrets.outputs.dashboardIdentityId
  }
}
output keyVault object = {
  id: identitySecrets.outputs.keyVaultId
  name: identitySecrets.outputs.keyVaultName
  uri: identitySecrets.outputs.keyVaultUri
}
output location string = location
output monitoring object = {
  applicationInsightsConnectionString: monitoring.outputs.applicationInsightsConnectionString
  applicationInsightsId: monitoring.outputs.applicationInsightsId
  logAnalyticsCustomerId: monitoring.outputs.logAnalyticsCustomerId
  logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
}
output names object = naming.outputs.names
output realtime object = {
  hostName: realtime.outputs.hostName
  id: realtime.outputs.id
  name: realtime.outputs.name
  serviceUri: realtime.outputs.serviceUri
}
output tags object = tagging.outputs.tags
