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

output location string = location
output names object = naming.outputs.names
output tags object = tagging.outputs.tags
