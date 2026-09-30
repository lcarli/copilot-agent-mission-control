targetScope = 'resourceGroup'

import { WorkshopRuntime } from '../runtime-types.bicep'

metadata description = 'Azure Container Registry and Container Apps runtime.'

param location string
param names object
param tags object
param apiIdentityId string
param apiIdentityClientId string
param apiIdentityPrincipalId string
param dashboardIdentityId string
param dashboardIdentityPrincipalId string
param logAnalyticsWorkspaceName string
param applicationInsightsConnectionString string
param keyVaultUri string
param cosmosEndpoint string
param cosmosDatabaseName string
param stateContainerName string
param signalRServiceUri string
param runtimeConfiguration WorkshopRuntime

var isWorkshop = runtimeConfiguration.mode == 'workshop'
var bootstrapImage = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
var apiPort = isWorkshop ? 3000 : 80
var dashboardPort = isWorkshop ? 8080 : 80
var hostedEnvironment = runtimeConfiguration.mode == 'workshop' ? [
  { name: 'WORKSHOP_RUNTIME', value: 'hosted' }
  { name: 'HOST', value: '0.0.0.0' }
  { name: 'PORT', value: '3000' }
  { name: 'ENTRA_TENANT_ID', value: runtimeConfiguration.entraTenantId }
  { name: 'ENTRA_API_CLIENT_ID', value: runtimeConfiguration.entraApiClientId }
  { name: 'ENTRA_SPA_CLIENT_ID', value: runtimeConfiguration.entraSpaClientId }
  { name: 'DASHBOARD_ORIGIN', value: runtimeConfiguration.dashboardOrigin }
  { name: 'UNIT_SIGNING_SECRET_NAME', value: runtimeConfiguration.unitSigningSecretName }
  { name: 'UNIT_SIGNING_SECRET_VERSION', value: runtimeConfiguration.unitSigningSecretVersion }
  { name: 'CAMPAIGN_RUNTIME_BLOB_URL', value: runtimeConfiguration.campaignRuntimeBlobUrl }
  { name: 'CAMPAIGN_RUNTIME_SHA256', value: runtimeConfiguration.campaignRuntimeSha256 }
] : []

var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: logAnalyticsWorkspaceName
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: names.containerRegistry
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    #disable-next-line BCP037 // Supported by ACR despite the incomplete stable API type definition.
    anonymousPullEnabled: false
    dataEndpointEnabled: false
    networkRuleBypassOptions: 'AzureServices'
    publicNetworkAccess: 'Enabled'
    zoneRedundancy: 'Disabled'
  }
}

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: names.containerAppsEnvironment
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
    zoneRedundant: false
  }
}

resource apiAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, apiIdentityPrincipalId, acrPullRoleId)
  scope: registry
  properties: {
    principalId: apiIdentityPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
  }
}

resource dashboardAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, dashboardIdentityPrincipalId, acrPullRoleId)
  scope: registry
  properties: {
    principalId: dashboardIdentityPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
  }
}

resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: names.missionControlApiContainerApp
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${apiIdentityId}': {}
    }
  }
  properties: {
    environmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        allowInsecure: false
        external: true
        targetPort: apiPort
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
        transport: 'auto'
      }
      registries: isWorkshop ? [
        {
          identity: apiIdentityId
          server: registry.properties.loginServer
        }
      ] : []
    }
    template: {
      containers: [
        {
          name: 'mission-control-api'
          image: runtimeConfiguration.mode == 'workshop' ? runtimeConfiguration.apiImage : bootstrapImage
          env: concat([
            { name: 'NODE_ENV', value: 'production' }
            { name: 'AZURE_CLIENT_ID', value: apiIdentityClientId }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: applicationInsightsConnectionString }
            { name: 'KEY_VAULT_URI', value: keyVaultUri }
            { name: 'COSMOS_ENDPOINT', value: cosmosEndpoint }
            { name: 'COSMOS_DATABASE', value: cosmosDatabaseName }
            { name: 'COSMOS_STATE_CONTAINER', value: stateContainerName }
            { name: 'SIGNALR_SERVICE_URI', value: signalRServiceUri }
          ], hostedEnvironment)
          probes: [
            {
              type: 'Startup'
              httpGet: { path: isWorkshop ? '/api/v1/health/live' : '/', port: apiPort }
              periodSeconds: 10
              failureThreshold: 30
            }
            {
              type: 'Liveness'
              httpGet: { path: isWorkshop ? '/api/v1/health/live' : '/', port: apiPort }
              initialDelaySeconds: 10
              periodSeconds: 30
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: { path: isWorkshop ? '/api/v1/health/ready' : '/', port: apiPort }
              timeoutSeconds: 5
              initialDelaySeconds: 5
              periodSeconds: 10
              failureThreshold: 3
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

resource dashboard 'Microsoft.App/containerApps@2024-03-01' = {
  name: names.dashboardContainerApp
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${dashboardIdentityId}': {}
    }
  }
  properties: {
    environmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        allowInsecure: false
        external: true
        targetPort: dashboardPort
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
        transport: 'auto'
      }
      registries: isWorkshop ? [
        {
          identity: dashboardIdentityId
          server: registry.properties.loginServer
        }
      ] : []
    }
    template: {
      containers: [
        {
          name: 'command-center'
          image: runtimeConfiguration.mode == 'workshop' ? runtimeConfiguration.dashboardImage : bootstrapImage
          env: [
            { name: 'MISSION_CONTROL_API_URL', value: 'https://${api.properties.configuration.ingress.fqdn}' }
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: string(dashboardPort) }
          ]
          probes: [
            {
              type: 'Startup'
              httpGet: { path: isWorkshop ? '/health/live' : '/', port: dashboardPort }
              periodSeconds: 10
              failureThreshold: 30
            }
            {
              type: 'Liveness'
              httpGet: { path: isWorkshop ? '/health/live' : '/', port: dashboardPort }
              initialDelaySeconds: 10
              periodSeconds: 30
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: { path: isWorkshop ? '/health/ready' : '/', port: dashboardPort }
              initialDelaySeconds: 5
              periodSeconds: 10
              failureThreshold: 3
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
        rules: [
          {
            name: 'http'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

output apiFqdn string = api.properties.configuration.ingress.fqdn
output dashboardFqdn string = dashboard.properties.configuration.ingress.fqdn
output environmentId string = environment.id
output registryId string = registry.id
output registryLoginServer string = registry.properties.loginServer
