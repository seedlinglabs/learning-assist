#!/bin/bash
set -euo pipefail

# Connect Topics Lambda to API Gateway
AWS_REGION="${AWS_REGION:-us-west-2}"
API_ID="xvq11x0421"
STAGE_NAME="pre-prod"
TOPICS_FUNCTION_NAME="learning-assist-topics"
PROFILE="${AWS_PROFILE:-AdministratorAccess-143320675925}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
log(){ echo -e "${GREEN}[INFO]${NC} $*"; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $*"; }
err(){ echo -e "${RED}[ERROR]${NC} $*"; }

log "Connecting Topics Lambda to API Gateway"
log "API ID: $API_ID, Region: $AWS_REGION"

# Get Topics Lambda ARN
TOPICS_FUNCTION_ARN=$(aws lambda get-function --function-name "$TOPICS_FUNCTION_NAME" --region "$AWS_REGION" --profile "$PROFILE" --query 'Configuration.FunctionArn' --output text)
log "Topics Lambda ARN: $TOPICS_FUNCTION_ARN"

# Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id "$API_ID" --region "$AWS_REGION" --profile "$PROFILE" --query 'items[?path==`/`].id' --output text)
log "Root resource ID: $ROOT_RESOURCE_ID"

# Create /topics resource
log "Creating /topics resource..."
TOPICS_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id "$API_ID" \
  --parent-id "$ROOT_RESOURCE_ID" \
  --path-part "topics" \
  --region "$AWS_REGION" \
  --profile "$PROFILE" \
  --query 'id' --output text 2>/dev/null || \
  aws apigateway get-resources --rest-api-id "$API_ID" --region "$AWS_REGION" --profile "$PROFILE" --query 'items[?pathPart==`topics`].id' --output text)

log "Topics resource ID: $TOPICS_RESOURCE_ID"

# Add GET /topics
log "Adding GET /topics..."
aws apigateway put-method --rest-api-id "$API_ID" --resource-id "$TOPICS_RESOURCE_ID" --http-method GET --authorization-type "NONE" --region "$AWS_REGION" --profile "$PROFILE" 2>/dev/null || true

aws apigateway put-integration \
  --rest-api-id "$API_ID" \
  --resource-id "$TOPICS_RESOURCE_ID" \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$AWS_REGION:lambda:path/2015-03-31/functions/$TOPICS_FUNCTION_ARN/invocations" \
  --region "$AWS_REGION" \
  --profile "$PROFILE" 2>/dev/null || true

# Add POST /topics
log "Adding POST /topics..."
aws apigateway put-method --rest-api-id "$API_ID" --resource-id "$TOPICS_RESOURCE_ID" --http-method POST --authorization-type "NONE" --region "$AWS_REGION" --profile "$PROFILE" 2>/dev/null || true

aws apigateway put-integration \
  --rest-api-id "$API_ID" \
  --resource-id "$TOPICS_RESOURCE_ID" \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$AWS_REGION:lambda:path/2015-03-31/functions/$TOPICS_FUNCTION_ARN/invocations" \
  --region "$AWS_REGION" \
  --profile "$PROFILE" 2>/dev/null || true

# Create /topics/{topicId} resource
log "Creating /topics/{topicId} resource..."
TOPIC_ID_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id "$API_ID" \
  --parent-id "$TOPICS_RESOURCE_ID" \
  --path-part "{topicId}" \
  --region "$AWS_REGION" \
  --profile "$PROFILE" \
  --query 'id' --output text 2>/dev/null || \
  aws apigateway get-resources --rest-api-id "$API_ID" --region "$AWS_REGION" --profile "$PROFILE" --query 'items[?pathPart==`{topicId}`].id' --output text)

log "Topic ID resource ID: $TOPIC_ID_RESOURCE_ID"

# Add GET /topics/{topicId}
log "Adding GET /topics/{topicId}..."
aws apigateway put-method --rest-api-id "$API_ID" --resource-id "$TOPIC_ID_RESOURCE_ID" --http-method GET --authorization-type "NONE" --region "$AWS_REGION" --profile "$PROFILE" 2>/dev/null || true

aws apigateway put-integration \
  --rest-api-id "$API_ID" \
  --resource-id "$TOPIC_ID_RESOURCE_ID" \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$AWS_REGION:lambda:path/2015-03-31/functions/$TOPICS_FUNCTION_ARN/invocations" \
  --region "$AWS_REGION" \
  --profile "$PROFILE" 2>/dev/null || true

# Add PUT /topics/{topicId}
log "Adding PUT /topics/{topicId}..."
aws apigateway put-method --rest-api-id "$API_ID" --resource-id "$TOPIC_ID_RESOURCE_ID" --http-method PUT --authorization-type "NONE" --region "$AWS_REGION" --profile "$PROFILE" 2>/dev/null || true

aws apigateway put-integration \
  --rest-api-id "$API_ID" \
  --resource-id "$TOPIC_ID_RESOURCE_ID" \
  --http-method PUT \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$AWS_REGION:lambda:path/2015-03-31/functions/$TOPICS_FUNCTION_ARN/invocations" \
  --region "$AWS_REGION" \
  --profile "$PROFILE" 2>/dev/null || true

# Add DELETE /topics/{topicId}
log "Adding DELETE /topics/{topicId}..."
aws apigateway put-method --rest-api-id "$API_ID" --resource-id "$TOPIC_ID_RESOURCE_ID" --http-method DELETE --authorization-type "NONE" --region "$AWS_REGION" --profile "$PROFILE" 2>/dev/null || true

aws apigateway put-integration \
  --rest-api-id "$API_ID" \
  --resource-id "$TOPIC_ID_RESOURCE_ID" \
  --http-method DELETE \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$AWS_REGION:lambda:path/2015-03-31/functions/$TOPICS_FUNCTION_ARN/invocations" \
  --region "$AWS_REGION" \
  --profile "$PROFILE" 2>/dev/null || true

# Add Lambda permissions
log "Adding Lambda invoke permissions..."
aws lambda add-permission \
  --function-name "$TOPICS_FUNCTION_NAME" \
  --statement-id apigateway-topics-get \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$AWS_REGION:$(aws sts get-caller-identity --profile "$PROFILE" --query Account --output text):$API_ID/*/*/topics*" \
  --region "$AWS_REGION" \
  --profile "$PROFILE" 2>/dev/null || warn "Permission already exists"

# Deploy API
log "Deploying API to stage: $STAGE_NAME..."
aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name "$STAGE_NAME" \
  --region "$AWS_REGION" \
  --profile "$PROFILE" >/dev/null

log "✅ Topics endpoints connected successfully!"
log "API URL: https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/$STAGE_NAME"
log "Endpoints:"
log "  GET    /topics"
log "  POST   /topics"
log "  GET    /topics/{topicId}"
log "  PUT    /topics/{topicId}"
log "  DELETE /topics/{topicId}"
