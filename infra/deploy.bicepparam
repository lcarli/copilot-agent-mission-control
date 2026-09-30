using './deploy.bicep'

param resourceGroupName = 'rg-camc-dev'
param location = 'canadaeast'
param workloadName = 'camc'
param environmentName = 'dev'
param owner = 'mission-control-team'
param keyVaultPurgeProtectionEnabled = false
param runtimeConfiguration = { mode: 'bootstrap' }
param additionalTags = {
  purpose: 'workshop'
}
