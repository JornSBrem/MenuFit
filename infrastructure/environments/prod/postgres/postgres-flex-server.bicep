@description('Deployment location for Postgres resources.')
param location string = resourceGroup().location

@description('Service prefix.')
param serviceName string = 'menufit'

@description('Environment suffix.')
param environmentName string = 'prod'

@description('Postgres admin username.')
param administratorLogin string

@description('Postgres admin password (use secure secret source).')
@secure()
param administratorPassword string

@description('Postgres version.')
@allowed([
  '15'
  '16'
])
param postgresVersion string = '16'

@description('Flexible server SKU name.')
param skuName string = 'Standard_D4ds_v5'

@description('Storage in GB.')
@minValue(32)
param storageGb int = 128

@description('Primary application database name.')
param databaseName string = 'menufit'

@description('Common tags.')
param tags object = {
  service: serviceName
  environment: environmentName
  managedBy: 'bicep'
  workload: 'postgres-runtime'
}

var serverName = take(replace('${serviceName}-${environmentName}-pg', '-', ''), 63)

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: serverName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: 'GeneralPurpose'
  }
  properties: {
    version: postgresVersion
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    storage: {
      storageSizeGB: storageGb
      autoGrow: 'Enabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
    backup: {
      backupRetentionDays: 14
      geoRedundantBackup: 'Enabled'
    }
    highAvailability: {
      mode: 'ZoneRedundant'
    }
    maintenanceWindow: {
      customWindow: 'Disabled'
      dayOfWeek: 0
      startHour: 0
      startMinute: 0
    }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresServer
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource poolingConnectionsConfig 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-12-01-preview' = {
  parent: postgresServer
  name: 'max_connections'
  properties: {
    value: '500'
    source: 'user-override'
  }
}

output postgresServerName string = postgresServer.name
output postgresFqdn string = postgresServer.properties.fullyQualifiedDomainName
output postgresDatabaseName string = postgresDb.name
