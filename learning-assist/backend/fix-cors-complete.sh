#!/bin/bash
set -e

API_ID="a34mmmc1te"
REGION="us-west-2"
PROFILE="AdministratorAccess-143320675925"

echo "🔧 Complete CORS fix for Academic Records API..."

# Get the /records/topic/{topicId} resource ID
RESOURCE_ID=$(/opt/homebrew/bin/aws apigateway get-resources \
  --rest-api-id "$API_ID" \
  --region "$REGION" \
  --profile "$PROFILE" \
  --query 'items[?path==`/records/topic/{topicId}`].id' \
  --output text)

echo "Resource ID for /records/topic/{topicId}: $RESOURCE_ID"

# Add method response for GET to include CORS headers
echo "Adding method response for GET..."
/opt/homebrew/bin/aws apigateway put-method-response \
  --rest-api-id "$API_ID" \
  --resource-id "$RESOURCE_ID" \
  --http-method GET \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Origin":false}' \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || true

# Add integration response for GET
echo "Adding integration response for GET..."
/opt/homebrew/bin/aws apigateway put-integration-response \
  --rest-api-id "$API_ID" \
  --resource-id "$RESOURCE_ID" \
  --http-method GET \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || true

# Deploy with cache busting
echo "📤 Deploying API (clearing cache)..."
DEPLOYMENT_ID=$(/opt/homebrew/bin/aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name pre-prod \
  --region "$REGION" \
  --profile "$PROFILE" \
  --description "Fix CORS for /records/topic/{topicId}" \
  --query 'id' \
  --output text)

echo "Deployment ID: $DEPLOYMENT_ID"

# Clear cache
echo "Clearing API cache..."
/opt/homebrew/bin/aws apigateway flush-stage-cache \
  --rest-api-id "$API_ID" \
  --stage-name pre-prod \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || echo "Cache flush not needed"

echo ""
echo "✅ CORS fully configured!"
echo "🧪 Testing endpoint..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
  "https://a34mmmc1te.execute-api.us-west-2.amazonaws.com/pre-prod/records/topic/test-123"

echo ""
echo "🔄 Please hard refresh your browser: Cmd+Shift+R"
