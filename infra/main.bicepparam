using './main.bicep'

param workloadName = 'camc'
param environmentName = 'dev'
param location = 'eastus2'
param owner = 'mission-control-team'
param additionalTags = {
  purpose: 'workshop'
}
