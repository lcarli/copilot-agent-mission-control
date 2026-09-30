using './main.bicep'

param workloadName = 'camc'
param environmentName = 'dev'
param location = 'canadaeast'
param owner = 'mission-control-team'
param logRetentionInDays = 30
param logDailyQuotaGb = 1
param keyVaultSoftDeleteRetentionInDays = 7
param keyVaultPurgeProtectionEnabled = false
param storageSku = 'Standard_LRS'
param blobDeleteRetentionInDays = 7
param runtimeConfiguration = { mode: 'bootstrap' }
param additionalTags = {
  purpose: 'workshop'
}
