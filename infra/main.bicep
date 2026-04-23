param location string = resourceGroup().location
param appServicePlanName string = 'cyrus-app-plan'
param webAppName string = 'cyrus-web-app'
param openAiName string = 'cyrus-openai'
param documentIntelligenceName string = 'cyrus-doc-intel'
param managedIdentityName string = 'cyrus-managed-identity'
param appInsightsName string = 'cyrus-app-insights'
param sku string = 'B1' // B1 or S1

// Managed Identity
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: managedIdentityName
  location: location
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: null // Can be linked to Log Analytics if needed
  }
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2024-11-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    reserved: true // Linux
  }
}

// Azure OpenAI
resource openAi 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: openAiName
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'OpenAI'
  properties: {
    customSubDomainName: openAiName
    publicNetworkAccess: 'Enabled'
  }
}

// Document Intelligence
resource documentIntelligence 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: documentIntelligenceName
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'FormRecognizer'
  properties: {
    customSubDomainName: documentIntelligenceName
    publicNetworkAccess: 'Enabled'
  }
}

// Web App
resource webApp 'Microsoft.Web/sites@2024-11-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|18-lts'
      appSettings: [
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: openAi.properties.endpoint
        }
        {
          name: 'AZURE_OPENAI_KEY'
          value: openAi.listKeys().key1
        }
        {
          name: 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT'
          value: documentIntelligence.properties.endpoint
        }
        {
          name: 'AZURE_DOCUMENT_INTELLIGENCE_KEY'
          value: documentIntelligence.listKeys().key1
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
      ]
    }
    identity: {
      type: 'UserAssigned'
      userAssignedIdentities: {
        '${managedIdentity.id}': {}
      }
    }
  }
  dependsOn: [
    appServicePlan
    openAi
    documentIntelligence
    managedIdentity
    appInsights
  ]
}

// Role assignments for managed identity to access Cognitive Services
resource openAiRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(managedIdentity.id, openAi.id, '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd') // Cognitive Services User role
  properties: {
    roleDefinitionId: '/providers/Microsoft.Authorization/roleDefinitions/5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
  scope: openAi
}

resource docIntelRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(managedIdentity.id, documentIntelligence.id, '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd') // Cognitive Services User role
  properties: {
    roleDefinitionId: '/providers/Microsoft.Authorization/roleDefinitions/5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
  scope: documentIntelligence
}

// Outputs
output webAppUrl string = 'https://${webApp.properties.defaultHostname}'
output openAiEndpoint string = openAi.properties.endpoint
output documentIntelligenceEndpoint string = documentIntelligence.properties.endpoint
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output managedIdentityClientId string = managedIdentity.properties.clientId