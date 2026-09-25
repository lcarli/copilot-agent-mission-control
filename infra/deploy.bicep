targetScope = 'subscription'

metadata description = 'Subscription-scoped deployment entrypoint for Mission Control.'

@description('Resource group that contains the environment.')
param resourceGroupName string

@description('Azure region used by the resource group and regional resources.')
param location string

@description('Short workload identifier.')
param workloadName string = 'camc'

@description('Short environment identifier.')
param environmentName string

@description('Team or person responsible for the deployed environment.')
param owner string

@description('Principal allowed to seed immutable campaign packages.')
param campaignSeederPrincipalId string = ''

@description('Protect the Key Vault from purge during the soft-delete retention period.')
param keyVaultPurgeProtectionEnabled bool = false

@description('API image reference.')
param apiImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Dashboard image reference.')
param dashboardImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Additional non-sensitive tags.')
param additionalTags object = {}

resource environmentResourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: union(additionalTags, {
    environment: environmentName
    managedBy: 'bicep'
    owner: owner
    workload: workloadName
  })
}

module platform './main.bicep' = {
  name: 'mission-control-platform'
  scope: environmentResourceGroup
  params: {
    additionalTags: additionalTags
    apiImage: apiImage
    campaignSeederPrincipalId: campaignSeederPrincipalId
    dashboardImage: dashboardImage
    environmentName: environmentName
    keyVaultPurgeProtectionEnabled: keyVaultPurgeProtectionEnabled
    location: location
    owner: owner
    workloadName: workloadName
  }
}

output data object = platform.outputs.data
output identity object = platform.outputs.identity
output keyVault object = platform.outputs.keyVault
output monitoring object = platform.outputs.monitoring
output names object = platform.outputs.names
output realtime object = platform.outputs.realtime
output resourceGroupName string = environmentResourceGroup.name
output runtime object = platform.outputs.runtime
