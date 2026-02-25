@description('Name of the Front Door WAF policy.')
param policyName string

@description('Resource tags for the WAF policy.')
param tags object = {
  service: 'menufit-backend'
  environment: 'prod'
  managedBy: 'policy-as-code'
}

@description('Policy enforcement mode: Prevention or Detection.')
@allowed([
  'Prevention'
  'Detection'
])
param enforcementMode string = 'Prevention'

@description('Critical API path prefixes protected by custom rules.')
param criticalApiPathPrefixes array = [
  '/api/v3/admin/'
  '/api/v3/system/'
  '/api/v3/auth/'
  '/api/v3/observability/'
]

@description('Rate limit threshold per minute for critical mutating endpoints.')
@minValue(10)
param criticalApiRateLimitPerMinute int = 180

@description('When true, associates the WAF policy to an existing Front Door profile security policy.')
param associateWithFrontDoor bool = false

@description('Front Door profile name when association is enabled.')
param frontDoorProfileName string = ''

@description('Front Door security policy name when association is enabled.')
param securityPolicyName string = '${policyName}-security'

@description('Front Door custom domain resource IDs to associate when association is enabled.')
param frontDoorDomainResourceIds array = []

@description('Path patterns matched at Front Door association level.')
param patternsToMatch array = [
  '/*'
]

resource wafPolicy 'Microsoft.Cdn/CdnWebApplicationFirewallPolicies@2024-02-01' = {
  name: policyName
  location: 'Global'
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
  tags: tags
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: enforcementMode
      requestBodyCheck: 'Enabled'
      fileUploadLimitInMb: 100
      maxRequestBodySizeInKb: 128
      javascriptChallengeExpirationInMinutes: 30
    }
    managedRules: {
      managedRuleSets: [
        {
          ruleSetType: 'Microsoft_DefaultRuleSet'
          ruleSetVersion: '2.1'
          ruleSetAction: 'Block'
        }
        {
          ruleSetType: 'Microsoft_BotManagerRuleSet'
          ruleSetVersion: '1.1'
          ruleSetAction: 'Block'
        }
      ]
    }
    customRules: {
      rules: [
        {
          name: 'RateLimitCriticalMutations'
          priority: 10
          enabledState: 'Enabled'
          ruleType: 'RateLimitRule'
          rateLimitDurationInMinutes: 1
          rateLimitThreshold: criticalApiRateLimitPerMinute
          action: 'Block'
          matchConditions: [
            {
              matchVariable: 'RequestUri'
              operator: 'BeginsWith'
              negationCondition: false
              matchValue: criticalApiPathPrefixes
              transforms: [
                'Lowercase'
              ]
            }
            {
              matchVariable: 'RequestMethod'
              operator: 'Equal'
              negationCondition: false
              matchValue: [
                'POST'
                'PUT'
                'PATCH'
                'DELETE'
              ]
              transforms: []
            }
          ]
        }
        {
          name: 'BlockSuspiciousAdminQuery'
          priority: 20
          enabledState: 'Enabled'
          ruleType: 'MatchRule'
          action: 'Block'
          matchConditions: [
            {
              matchVariable: 'RequestUri'
              operator: 'BeginsWith'
              negationCondition: false
              matchValue: [
                '/api/v3/admin/'
              ]
              transforms: [
                'Lowercase'
              ]
            }
            {
              matchVariable: 'QueryString'
              operator: 'Contains'
              negationCondition: false
              matchValue: [
                '<script'
                'union select'
                '../'
              ]
              transforms: [
                'Lowercase'
                'UrlDecode'
              ]
            }
          ]
        }
      ]
    }
  }
}

resource frontDoorProfile 'Microsoft.Cdn/profiles@2024-02-01' existing = if (associateWithFrontDoor) {
  name: frontDoorProfileName
}

resource securityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2024-02-01' = if (associateWithFrontDoor) {
  parent: frontDoorProfile
  name: securityPolicyName
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: {
        id: wafPolicy.id
      }
      associations: [
        {
          domains: [for domainId in frontDoorDomainResourceIds: {
            id: domainId
          }]
          patternsToMatch: patternsToMatch
        }
      ]
    }
  }
}

output wafPolicyResourceId string = wafPolicy.id
output securityPolicyResourceId string = associateWithFrontDoor ? securityPolicy.id : ''
