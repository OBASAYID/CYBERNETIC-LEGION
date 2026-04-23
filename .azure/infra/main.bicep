param environmentName string = 'dev'
param location string = resourceGroup().location
param principalId string = ''

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'asp-cyrus-${environmentName}'
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  properties: {
    reserved: true // Linux
  }
}

// Web App
resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: 'app-cyrus-${environmentName}'
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|18-lts'
      appSettings: [
        {
          name: 'AI_INTEGRATIONS_OPENAI_BASE_URL'
          value: openAi.outputs.endpoint
        }
        {
          name: 'AI_INTEGRATIONS_OPENAI_API_KEY'
          value: openAi.listKeys().key1
        }
        {
          name: 'AI_INTEGRATIONS_OPENAI_MODEL_DEPLOYMENT'
          value: openAiModelDeployment.name
        }
        {
          name: 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT'
          value: documentIntelligence.outputs.endpoint
        }
        {
          name: 'AZURE_DOCUMENT_INTELLIGENCE_KEY'
          value: documentIntelligence.listKeys().key1
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
      ]
    }
  }
  identity: {
    type: 'SystemAssigned'
  }
}

// Azure OpenAI
resource openAi 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: 'cog-cyrus-openai-${environmentName}'
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'OpenAI'
  properties: {
    customSubDomainName: 'cyrus-openai-${environmentName}'
    publicNetworkAccess: 'Enabled'
  }
}

// Azure OpenAI Model Deployment (GPT-4o-mini)
resource openAiModelDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openAi
  name: 'gpt-4o-mini'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o-mini'
      version: '2024-07-18'
    }
    scaleSettings: {
      scaleType: 'Standard'
    }
  }
}

// Document Intelligence
resource documentIntelligence 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: 'cog-cyrus-docintel-${environmentName}'
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'FormRecognizer'
  properties: {
    customSubDomainName: 'cyrus-docintel-${environmentName}'
    publicNetworkAccess: 'Enabled'
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-cyrus-${environmentName}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Role assignments for Managed Identity
resource openAiRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, webApp.identity.principalId, 'Cognitive Services User')
  scope: openAi
  properties: {
    principalId: webApp.identity.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908') // Cognitive Services User
  }
}

resource docIntelRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, webApp.identity.principalId, 'Cognitive Services User')
  scope: documentIntelligence
  properties: {
    principalId: webApp.identity.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908') // Cognitive Services User
  }
}

// Outputs
output AZURE_OPENAI_ENDPOINT string = openAi.outputs.endpoint
output AZURE_OPENAI_MODEL_DEPLOYMENT string = openAiModelDeployment.name
output AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT string = documentIntelligence.outputs.endpoint
output WEB_APP_URL string = 'https://${webApp.properties.defaultHostname}'
output APPLICATIONINSIGHTS_CONNECTION_STRING string = appInsights.properties.ConnectionString