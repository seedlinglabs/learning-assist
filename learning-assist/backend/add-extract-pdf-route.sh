#!/bin/bash
set -e

API_ID="xvq11x0421"
REGION="us-west-2"
PROFILE="AdministratorAccess-143320675925"

echo "🔧 Adding /extract-pdf route to API Gateway..."

# Get root resource
ROOT_ID=$(/opt/homebrew/bin/aws apigateway get-resources --rest-api-id "$API_ID" --region "$REGION" --profile "$PROFILE" --query 'items[?path==`/`].id' --output text)

# Get Lambda ARN
LAMBDA_ARN=$(/opt/homebrew/bin/aws lambda get-function --function-name learning-assist-topics --region "$REGION" --profile "$PROFILE" --query 'Configuration.FunctionArn' --output text)

# Create /extract-pdf resource
echo "Creating /extract-pdf resource..."
EXTRACT_PDF_ID=$(/opt/homebrew/bin/aws apigateway create-resource \
  --rest-api-id "$API_ID" \
  --parent-id "$ROOT_ID" \
  --path-part "extract-pdf" \
  --region "$REGION" \
  --profile "$PROFILE" \
  --query 'id' --output text 2>/dev/null || \
  /opt/homebrew/bin/aws apigateway get-resources --rest-api-id "$API_ID" --region "$REGION" --profile "$PROFILE" --query 'items[?pathPart==`extract-pdf`].id' --output text)

# Add POST method
/opt/homebrew/bin/aws apigateway put-method \
  --rest-api-id "$API_ID" \
  --resource-id "$EXTRACT_PDF_ID" \
  --http-method POST \
  --authorization-type NONE \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || true

# Add Lambda integration
/opt/homebrew/bin/aws apigateway put-integration \
  --rest-api-id "$API_ID" \
  --resource-id "$EXTRACT_PDF_ID" \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || true

# Add OPTIONS for CORS
/opt/homebrew/bin/aws apigateway put-method \
  --rest-api-id "$API_ID" \
  --resource-id "$EXTRACT_PDF_ID" \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || true

/opt/homebrew/bin/aws apigateway put-integration \
  --rest-api-id "$API_ID" \
  --resource-id "$EXTRACT_PDF_ID" \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || true

/opt/homebrew/bin/aws apigateway put-method-response \
  --rest-api-id "$API_ID" \
  --resource-id "$EXTRACT_PDF_ID" \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers":false,"method.response.header.Access-Control-Allow-Methods":false,"method.response.header.Access-Control-Allow-Origin":false}' \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || true

/opt/homebrew/bin/aws apigateway put-integration-response \
  --rest-api-id "$API_ID" \
  --resource-id "$EXTRACT_PDF_ID" \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'POST,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || true

# Add Lambda permission
/opt/homebrew/bin/aws lambda add-permission \
  --function-name learning-assist-topics \
  --statement-id apigateway-extract-pdf \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:143320675925:$API_ID/*/*/extract-pdf" \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || echo "Permission already exists"

# Deploy
echo "📤 Deploying API..."
/opt/homebrew/bin/aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name pre-prod \
  --region "$REGION" \
  --profile "$PROFILE" \
  --description "Add /extract-pdf endpoint" >/dev/null

echo "✅ /extract-pdf endpoint added!"
echo "🔗 POST https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/extract-pdf"
