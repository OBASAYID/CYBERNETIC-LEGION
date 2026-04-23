# Cyrus AI System Infrastructure

This directory contains the Infrastructure as Code (IaC) for deploying the Cyrus AI system to Azure using Bicep templates.

## Components

- **App Service Plan**: Linux-based hosting plan (B1/S1 tier)
- **App Service Web App**: Node.js/TypeScript application hosting
- **Azure OpenAI**: GPT-4o-mini model for AI capabilities
- **Azure Document Intelligence**: OCR and document processing
- **Managed Identity**: Secure authentication for service-to-service communication
- **Application Insights**: Monitoring and telemetry (optional)

## Deployment

Use Azure Developer CLI (AZD) to deploy:

```bash
azd up
```

This will provision all resources and deploy the application.

## Configuration

Environment variables are automatically configured in the web app:

- `AZURE_OPENAI_ENDPOINT`: OpenAI service endpoint
- `AZURE_OPENAI_KEY`: OpenAI API key
- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`: Document Intelligence endpoint
- `AZURE_DOCUMENT_INTELLIGENCE_KEY`: Document Intelligence API key
- `APPLICATIONINSIGHTS_CONNECTION_STRING`: App Insights connection string

## Security

- Managed Identity is used for secure access to Azure services
- HTTPS-only enabled
- Role-based access control for Cognitive Services

## Monitoring

Application Insights provides telemetry and monitoring capabilities.