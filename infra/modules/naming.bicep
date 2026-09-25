targetScope = 'resourceGroup'

metadata description = 'Deterministic names for Mission Control Azure resources.'

@description('Short workload identifier from the orchestration template.')
@minLength(2)
@maxLength(12)
param workloadName string

@description('Short environment identifier from the orchestration template.')
@minLength(2)
@maxLength(8)
param environmentName string

@description('Azure region used to stabilize regional resource names.')
param location string

var workloadSegment = toLower(workloadName)
var environmentSegment = toLower(environmentName)
var readablePrefix = '${workloadSegment}-${environmentSegment}'
var compactPrefix = take(replace(replace(replace(readablePrefix, '-', ''), '_', ''), ' ', ''), 14)
var resourceToken = take(
  uniqueString(subscription().id, resourceGroup().id, location, workloadName, environmentName),
  6
)

output names object = {
  apiIdentity: 'id-${readablePrefix}-api-${resourceToken}'
  applicationInsights: 'appi-${readablePrefix}-${resourceToken}'
  containerAppsEnvironment: 'cae-${readablePrefix}-${resourceToken}'
  containerRegistry: 'cr${compactPrefix}${resourceToken}'
  cosmosAccount: 'cosmos-${readablePrefix}-${resourceToken}'
  dashboardIdentity: 'id-${readablePrefix}-dashboard-${resourceToken}'
  dashboardContainerApp: 'ca-${take(readablePrefix, 19)}-dashboard'
  keyVault: 'kv-${compactPrefix}-${resourceToken}'
  logAnalyticsWorkspace: 'log-${readablePrefix}-${resourceToken}'
  missionControlApiContainerApp: 'ca-${readablePrefix}-api'
  signalRService: 'sigr-${readablePrefix}-${resourceToken}'
  storageAccount: 'st${compactPrefix}${resourceToken}'
}
