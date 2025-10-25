#!/bin/bash
set -e

API_ID="a34mmmc1te"
REGION="us-west-2"
PROFILE="AdministratorAccess-143320675925"

echo "🔧 Adding /records/topic/{topicId} route to Academic Records API..."

# Get root resource
ROOT_ID=$(/opt/homebrew/bin/aws apigateway get-resources --rest-api-id "$API_ID" --region "$REGION" --profile "$PROFILE" --query 'items[?path==`/`].id' --output text)

# Get Lambda ARN
LAMBDA_ARN=$(/opt/homebrew/bin/aws lambda get-function --function-name academic-records-service --region "$REGION" --profile "$PROFILE" --query 'Configuration.FunctionArn' --output text)

# Create /records
echo "Creating /records..."
RECORDS_ID=$(/opt/homebrew/bin/aws apigateway create-resource \
  --rest-api-id "$API_ID" \
  --parent-id "$ROOT_ID" \
  --path-part "records" \
  --region "$REGION" \
  --profile "$PROFILE" \
  --query 'id' --output text 2>/dev/null || \
  /opt/homebrew/bin/aws apigateway get-resources --rest-api-id "$API_ID" --region "$REGION" --profile "$PROFILE" --query 'items[?pathPart==`records`].id' --output text)

# Create /records/topic
echo "Creating /records/topic..."
TOPIC_ID=$(/opt/homebrew/bin/aws apigateway create-resource \
  --rest-api-id "$API_ID" \
  --parent-id "$RECORDS_ID" \
  --path-part "topic" \
  --region "$REGION" \
  --profile "$PROFILE" \
  --query 'id' --output text 2>/dev/null || \
  /opt/homebrew/bin/aws apigateway get-resources --rest-api-id "$API_ID" --region "$REGION" --profile "$PROFILE" --query 'items[?pathPart==`topic`].id' --output text)

# Create /records/topic/{topicId}
echo "Creating /records/topic/{topicId}..."
TOPIC_PARAM_ID=$(/opt/homebrew/bin/aws apigateway create-resource \
  --rest-api-id "$API_ID" \
  --parent-id "$TOPIC_ID" \
  --path-part "{topicId}" \
  --region "$REGION" \
  --profile "$PROFILE" \
  --query 'id' --output text 2>/dev/null || \
  /opt/homebrew/bin/aws apigateway get-resources --rest-api-id "$API_ID" --region "$REGION" --profile "$PROFILE" --query 'items[?pathPart==`{topicId}`].id' --output text)

# Add GET method
echo "Adding GET method..."
/opt/homebrew/bin/aws apigateway put-method \
  --rest-api-id "$API_ID" \
  --resource-id "$TOPIC_PARAM_ID" \
  --http-method GET \
  --authorization-type NONE \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || true

# Add Lambda integration
echo "Adding Lambda integration..."
/opt/homebrew/bin/aws apigateway put-integration \
  --rest-api-id "$API_ID" \
  --resource-id "$TOPIC_PARAM_ID" \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || true

# Add OPTIONS for CORS
echo "Adding OPTIONS method..."
/opt/homebrew/bin/aws apigateway put-method \
  --rest-api-id "$API_ID" \
  --resource-id "$TOPIC_PARAM_ID" \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || true

/opt/homebrew/bin/aws apigateway put-integration \
  --rest-api-id "$API_ID" \
  --resource-id "$TOPIC_PARAM_ID" \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || true

/opt/homebrew/bin/aws apigateway put-method-response \
  --rest-api-id "$API_ID" \
  --resource-id "$TOPIC_PARAM_ID" \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers":false,"method.response.header.Access-Control-Allow-Methods":false,"method.response.header.Access-Control-Allow-Origin":false}' \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || true

/opt/homebrew/bin/aws apigateway put-integration-response \
  --rest-api-id "$API_ID" \
  --resource-id "$TOPIC_PARAM_ID" \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || true

# Add Lambda permission
echo "Adding Lambda permission..."
/opt/homebrew/bin/aws lambda add-permission \
  --function-name academic-records-service \
  --statement-id apigateway-records-topic-get \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:143320675925:$API_ID/*/*/records/topic/*" \
  --region "$REGION" \
  --profile "$PROFILE" 2>/dev/null || echo "Permission already exists"

# Deploy
echo "📤 Deploying API..."
/opt/homebrew/bin/aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name pre-prod \
  --region "$REGION" \
  --profile "$PROFILE" \
  --description "Add /records/topic/{topicId} route" >/dev/null

echo "✅ Route added successfully!"
echo "🔗 GET /records/topic/{topicId}"
