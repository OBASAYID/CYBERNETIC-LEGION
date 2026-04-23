# Cyrus AI System - Azure Deployment

This document describes the Azure infrastructure deployment for the Cyrus AI system using Azure Developer CLI (AZD).

## Architecture Overview

The Cyrus AI system is deployed with the following Azure resources:

- **App Service Plan** (B1 tier): Hosts the web application
- **App Service Web App** (Linux, Node.js 18 LTS): Runs the Express API
- **Azure OpenAI** (S0 tier): Provides GPT-4o-mini model for AI capabilities
- **Azure Document Intelligence** (S0 tier): Handles document analysis and OCR
- **Application Insights**: Provides monitoring and telemetry
- **Managed Identity**: Enables secure authentication between services

## Prerequisites

- Azure CLI installed and authenticated (`az login`)
- Azure Developer CLI installed (`npm install -g @azure/azd`)
- Node.js 18+ and npm installed locally

## Deployment Steps

### 1. Initialize AZD (if not already done)

```bash
azd init
```

### 2. Deploy Infrastructure

```bash
azd up
```

This command will:
- Create a new resource group (or use existing)
- Deploy all infrastructure components
- Configure managed identity permissions
- Set up environment variables

### 3. Configure Environment (Optional)

After deployment, you can update environment-specific settings:

```bash
azd env set AZURE_ENV_NAME production
```

## Environment Variables

The following environment variables are automatically configured:

- `AI_INTEGRATIONS_OPENAI_BASE_URL`: Azure OpenAI endpoint
- `AI_INTEGRATIONS_OPENAI_API_KEY`: Azure OpenAI access key
- `AI_INTEGRATIONS_OPENAI_MODEL_DEPLOYMENT`: Model deployment name (gpt-4o-mini)
- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`: Document Intelligence endpoint
- `AZURE_DOCUMENT_INTELLIGENCE_KEY`: Document Intelligence access key
- `APPLICATIONINSIGHTS_CONNECTION_STRING`: Application Insights connection string
- `NODE_ENV`: Set to 'production'

## Security Configuration

- **Managed Identity**: The web app uses system-assigned managed identity
- **Role Assignments**: Cognitive Services User role granted to access AI services
- **HTTPS Only**: Web app configured for HTTPS-only access
- **Network Security**: Public access enabled for AI services (configure VNet if needed)

## Monitoring

Application Insights is configured for:
- Request telemetry
- Performance monitoring
- Error tracking
- Custom metrics

## Cost Considerations

- **App Service Plan**: B1 tier (~$13/month)
- **Azure OpenAI**: S0 tier with GPT-4o-mini deployment
- **Document Intelligence**: S0 tier
- **Application Insights**: Included with App Service

Monitor usage in Azure Portal and adjust tiers as needed.

## Troubleshooting

### Common Issues

1. **Deployment Fails**: Check Azure subscription quotas and permissions
2. **AI Service Access**: Verify managed identity role assignments
3. **Model Deployment**: Ensure GPT-4o-mini is available in your region

### Logs

View deployment logs:
```bash
azd logs
```

View application logs in Azure Portal > App Service > Log Stream.

## Next Steps

After deployment:
1. Update your application code to use managed identity (recommended)
2. Configure custom domains and SSL certificates
3. Set up CI/CD pipelines
4. Configure backup and disaster recovery

## Support

For issues with this deployment:
1. Check Azure resource health in the portal
2. Review deployment logs with `azd logs`
3. Verify configuration in `.azure/` directory