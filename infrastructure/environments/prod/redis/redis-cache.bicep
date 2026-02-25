@description('Deployment location for Redis cache.')
param location string = resourceGroup().location

@description('Service prefix.')
param serviceName string = 'menufit'

@description('Environment name.')
param environmentName string = 'prod'

@description('Redis SKU family: C (Basic/Standard) or P (Premium).')
@allowed([
  'C'
  'P'
])
param redisSkuFamily string = 'C'

@description('Redis SKU name.')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param redisSkuName string = 'Standard'

@description('Redis capacity value (SKU dependent).')
param redisSkuCapacity int = 1

@description('Enable non-SSL port (should stay false in production).')
param enableNonSslPort bool = false

@description('Common tags.')
param tags object = {
  service: serviceName
  environment: environmentName
  managedBy: 'bicep'
  workload: 'distributed-lock'
}

var redisName = take(replace('${serviceName}-${environmentName}-redis', '-', ''), 63)

resource redis 'Microsoft.Cache/Redis@2024-03-01' = {
  name: redisName
  location: location
  tags: tags
  properties: {
    enableNonSslPort: enableNonSslPort
    minimumTlsVersion: '1.2'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
      'notify-keyspace-events': 'Exe'
    }
    sku: {
      family: redisSkuFamily
      name: redisSkuName
      capacity: redisSkuCapacity
    }
  }
}

output redisHost string = redis.properties.hostName
output redisSslPort int = redis.properties.sslPort
output redisResourceId string = redis.id
