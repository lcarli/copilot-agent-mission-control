targetScope = 'resourceGroup'

metadata description = 'Required and caller-supplied tags for Mission Control resources.'

@description('Short workload identifier from the orchestration template.')
param workloadName string

@description('Short environment identifier from the orchestration template.')
param environmentName string

@description('Team or person responsible for the deployed environment.')
param owner string

@description('Additional non-sensitive tags. Required platform tags take precedence.')
param additionalTags object = {}

var requiredTags = {
  application: workloadName
  environment: environmentName
  'managed-by': 'bicep'
  owner: owner
}

output tags object = union(additionalTags, requiredTags)
