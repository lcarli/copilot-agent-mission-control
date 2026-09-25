using './main.bicep'

param workloadName = 'camc'
param environmentName = 'dev'
param location = 'eastus2'
param owner = 'mission-control-team'
param logRetentionInDays = 30
param logDailyQuotaGb = 1
param keyVaultSoftDeleteRetentionInDays = 7
param keyVaultPurgeProtectionEnabled = false
param storageSku = 'Standard_LRS'
param blobDeleteRetentionInDays = 7
param apiImage = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
param dashboardImage = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
param additionalTags = {
  purpose: 'workshop'
}
