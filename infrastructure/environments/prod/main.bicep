@description('Deployment location for production infrastructure.')
param location string = resourceGroup().location

@description('Environment short name.')
param environmentName string = 'prod'

@description('Application/service name prefix.')
param serviceName string = 'menufit'

@description('Container image for backend runtime deployment.')
param backendImage string

@description('CIDR for production virtual network.')
param vnetAddressPrefix string = '10.80.0.0/16'

@description('CIDR for Container Apps infrastructure subnet.')
param containerAppsSubnetPrefix string = '10.80.1.0/24'

@description('Common tags applied to all resources.')
param tags object = {
  service: serviceName
  environment: environmentName
  managedBy: 'bicep'
  workload: 'backend'
}

var resourcePrefix = toLower('${serviceName}-${environmentName}')
var logWorkspaceName = take('${resourcePrefix}-log', 63)
var appInsightsName = take('${resourcePrefix}-appi', 260)
var keyVaultName = take(replace('${resourcePrefix}-kv', '-', ''), 24)
var storageAccountName = take(replace('${resourcePrefix}state', '-', ''), 24)
var vnetName = '${resourcePrefix}-vnet'
var subnetName = 'aca-subnet'
var containerEnvironmentName = '${resourcePrefix}-cae'
var containerAppName = '${resourcePrefix}-backend'
var frontDoorProfileName = '${resourcePrefix}-afd'

resource logWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logWorkspaceName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      searchVersion: 1
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logWorkspace.id
  }
}

resource network 'Microsoft.Network/virtualNetworks@2024-01-01' = {
  name: vnetName
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        vnetAddressPrefix
      ]
    }
    subnets: [
      {
        name: subnetName
        properties: {
          addressPrefix: containerAppsSubnetPrefix
          delegations: [
            {
              name: 'containerAppsDelegation'
              properties: {
                serviceName: 'Microsoft.App/environments'
              }
            }
          ]
        }
      }
    ]
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enabledForTemplateDeployment: true
    enableRbacAuthorization: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

resource stateStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource containerEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerEnvironmentName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logWorkspace.properties.customerId
        sharedKey: listKeys(logWorkspace.id, '2023-09-01').primarySharedKey
      }
    }
    vnetConfiguration: {
      infrastructureSubnetId: resourceId('Microsoft.Network/virtualNetworks/subnets', vnetName, subnetName)
      internal: false
    }
  }
}

resource backendApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: containerAppName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      activeRevisionsMode: 'Single'
    }
    template: {
      containers: [
        {
          name: 'backend'
          image: backendImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsights.properties.ConnectionString
            }
            {
              name: 'MENUFIT_STORAGE_ACCOUNT_NAME'
              value: stateStorage.name
            }
            {
              name: 'MENUFIT_KEYVAULT_URI'
              value: keyVault.properties.vaultUri
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 4
      }
    }
  }
}

resource frontDoorProfile 'Microsoft.Cdn/profiles@2024-02-01' = {
  name: frontDoorProfileName
  location: 'Global'
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
  tags: tags
}

output containerAppFqdn string = backendApp.properties.configuration.ingress.fqdn
output containerAppName string = backendApp.name
output keyVaultUri string = keyVault.properties.vaultUri
output logAnalyticsWorkspaceId string = logWorkspace.id
output applicationInsightsConnectionString string = appInsights.properties.ConnectionString
output frontDoorProfileId string = frontDoorProfile.id
