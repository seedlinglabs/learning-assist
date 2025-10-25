#!/bin/bash
set -euo pipefail

AWS_REGION="us-west-2"
API_ID="xvq11x0421"
PROFILE="AdministratorAccess-143320675925"

echo "🔧 Enabling CORS on API Gateway..."

# Get all resources
RESOURCES=$(aws apigateway get-resources --rest-api-id "$API_ID" --region "$AWS_REGION" --profile "$PROFILE" --query 'items[*].[id,path]' --output text)

# For each resource, enable CORS by adding OPTIONS method
while IFS=$'\t' read -r RESOURCE_ID PATH; do
  echo "Processing: $PATH (ID: $RESOURCE_ID)"
  
  # Create OPTIONS method
  aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$RESOURCE_ID" \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region "$AWS_REGION" \
    --profile "$PROFILE" 2>/dev/null || true
  
  # Create mock integration for OPTIONS
  aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$RESOURCE_ID" \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
    --region "$AWS_REGION" \
    --profile "$PROFILE" 2>/dev/null || true
  
  # Add CORS headers to OPTIONS response
  aws apigateway put-method-response \
    --rest-api-id "$API_ID" \
    --resource-id "$RESOURCE_ID" \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":false,"method.response.header.Access-Control-Allow-Methods":false,"method.response.header.Access-Control-Allow-Origin":false}' \
    --region "$AWS_REGION" \
    --profile "$PROFILE" 2>/dev/null || true
  
  aws apigateway put-integration-response \
    --rest-api-id "$API_ID" \
    --resource-id "$RESOURCE_ID" \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
    --region "$AWS_REGION" \
    --profile "$PROFILE" 2>/dev/null || true
    
done <<< "$RESOURCES"

# Deploy the changes
echo "📤 Deploying changes..."
aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name pre-prod \
  --region "$AWS_REGION" \
  --profile "$PROFILE" >/dev/null

echo "✅ CORS enabled on all endpoints!"
echo "🔄 Please hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)"
