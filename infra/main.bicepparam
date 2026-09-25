using './main.bicep'

param workloadName = 'camc'
param environmentName = 'dev'
param location = 'eastus2'
param owner = 'mission-control-team'
param logRetentionInDays = 30
param logDailyQuotaGb = 1
param additionalTags = {
  purpose: 'workshop'
}
