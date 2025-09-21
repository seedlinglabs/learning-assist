#!/bin/bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-west-2}"
API_ID="${EXISTING_API_ID:-xvq11x0421}"
STAGE_NAME="${STAGE_NAME:-pre-prod}"
AUTH_FUNCTION_NAME="${AUTH_FUNCTION_NAME:-learning-assist-auth}"
GEMINI_FUNCTION_NAME="${GEMINI_FUNCTION_NAME:-learning-assist-gemini-proxy}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
log(){ echo -e "${GREEN}[INFO]${NC} $*"; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $*"; }
err(){ echo -e "${RED}[ERROR]${NC} $*"; }
dbg(){ echo -e "${BLUE}[DEBUG]${NC} $*"; }

log "Caller / Region"
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
CALLER_ARN=$(aws sts get-caller-identity --query 'Arn' --output text)
log "Account: $ACCOUNT_ID"
log "Caller : $CALLER_ARN"
log "Region : $AWS_REGION"

# Lambda existence - Auth
if ! aws lambda get-function --function-name "$AUTH_FUNCTION_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  err "Lambda $AUTH_FUNCTION_NAME not found in $AWS_REGION"; exit 1
fi
AUTH_FUNCTION_ARN=$(aws lambda get-function --function-name "$AUTH_FUNCTION_NAME" --region "$AWS_REGION" --query 'Configuration.FunctionArn' --output text)
log "Auth Lambda ARN: $AUTH_FUNCTION_ARN"

# Lambda existence - Gemini (optional)
GEMINI_FUNCTION_ARN=""
if aws lambda get-function --function-name "$GEMINI_FUNCTION_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  GEMINI_FUNCTION_ARN=$(aws lambda get-function --function-name "$GEMINI_FUNCTION_NAME" --region "$AWS_REGION" --query 'Configuration.FunctionArn' --output text)
  log "Gemini Lambda ARN: $GEMINI_FUNCTION_ARN"
else
  warn "Gemini Lambda $GEMINI_FUNCTION_NAME not found - skipping Gemini endpoints"
fi

# Detect API type
API_TYPE="UNKNOWN"
if aws apigateway get-rest-api --rest-api-id "$API_ID" --region "$AWS_REGION" >/dev/null 2>&1; then
  API_TYPE="REST"
else
  if aws apigatewayv2 get-api --api-id "$API_ID" --region "$AWS_REGION" >/dev/null 2>&1; then
    API_TYPE=$(aws apigatewayv2 get-api --api-id "$API_ID" --region "$AWS_REGION" --query 'ProtocolType' --output text)
  fi
fi

if [[ "$API_TYPE" == "UNKNOWN" ]]; then
  err "API $API_ID not found in $AWS_REGION (neither REST nor HTTP/WebSocket)."
  exit 1
fi
log "Detected API Type: $API_TYPE"

API_BASE_URL=""
if [[ "$API_TYPE" == "REST" ]]; then
  # --- REST (v1) path resources ---
  ROOT_ID=$(aws apigateway get-resources --rest-api-id "$API_ID" --region "$AWS_REGION" --query 'items[?path==`/`].id' --output text)
  if [[ -z "$ROOT_ID" || "$ROOT_ID" == "None" ]]; then err "Could not get REST API root resource id"; exit 1; fi
  dbg "Root resource id: $ROOT_ID"

  create_res () {
    local parent="$1" part="$2"
    local existing
    existing=$(aws apigateway get-resources --rest-api-id "$API_ID" --region "$AWS_REGION" \
      --query "items[?pathPart=='$part' && parentId=='$parent'].id" --output text 2>/dev/null || true)
    if [[ -n "$existing" && "$existing" != "None" ]]; then echo "$existing"; return; fi
    aws apigateway create-resource --rest-api-id "$API_ID" --region "$AWS_REGION" --parent-id "$parent" --path-part "$part" --query 'id' --output text
  }

  create_method () {
    local rid="$1" verb="$2" function_arn="${3:-$AUTH_FUNCTION_ARN}" function_name="${4:-$AUTH_FUNCTION_NAME}"
    aws apigateway put-method \
      --rest-api-id "$API_ID" --region "$AWS_REGION" \
      --resource-id "$rid" --http-method "$verb" \
      --authorization-type NONE --no-api-key-required >/dev/null 2>&1 || true

    aws apigateway put-integration \
      --rest-api-id "$API_ID" --region "$AWS_REGION" \
      --resource-id "$rid" --http-method "$verb" \
      --type AWS_PROXY --integration-http-method POST \
      --uri arn:aws:apigateway:$AWS_REGION:lambda:path/2015-03-31/functions/$function_arn/invocations >/dev/null 2>&1 || true

    # permission (unique statement id)
    aws lambda add-permission \
      --function-name "$function_name" --region "$AWS_REGION" \
      --statement-id "apigw-${API_ID}-${verb}-$(date +%s%N)" \
      --action lambda:InvokeFunction \
      --principal apigateway.amazonaws.com \
      --source-arn "arn:aws:execute-api:$AWS_REGION:$ACCOUNT_ID:$API_ID/*/$verb/*" >/dev/null 2>&1 || true
  }

  enable_cors () {
    local rid="$1"
    aws apigateway put-method --rest-api-id "$API_ID" --region "$AWS_REGION" --resource-id "$rid" --http-method OPTIONS \
      --authorization-type NONE --no-api-key-required >/dev/null 2>&1 || true

    aws apigateway put-integration --rest-api-id "$API_ID" --region "$AWS_REGION" --resource-id "$rid" --http-method OPTIONS \
      --type MOCK --request-templates '{"application/json":"{\"statusCode\":200}"}' >/dev/null 2>&1 || true

    aws apigateway put-method-response --rest-api-id "$API_ID" --region "$AWS_REGION" --resource-id "$rid" --http-method OPTIONS \
      --status-code 200 \
      --response-parameters \
      method.response.header.Access-Control-Allow-Headers=false,method.response.header.Access-Control-Allow-Methods=false,method.response.header.Access-Control-Allow-Origin=false >/dev/null 2>&1 || true

    aws apigateway put-integration-response --rest-api-id "$API_ID" --region "$AWS_REGION" --resource-id "$rid" --http-method OPTIONS \
      --status-code 200 \
      --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'\''Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'\''","method.response.header.Access-Control-Allow-Methods":"'\''GET,POST,PUT,DELETE,OPTIONS'\''","method.response.header.Access-Control-Allow-Origin":"'\''*'\''"}' >/dev/null 2>&1 || true
  }

  log "Creating /auth tree"
  AUTH_ID=$(create_res "$ROOT_ID" "auth"); enable_cors "$AUTH_ID"
  REG_ID=$(create_res "$AUTH_ID" "register"); create_method "$REG_ID" "POST"; enable_cors "$REG_ID"
  LOG_ID=$(create_res "$AUTH_ID" "login");    create_method "$LOG_ID" "POST"; enable_cors "$LOG_ID"
  VER_ID=$(create_res "$AUTH_ID" "verify");   create_method "$VER_ID" "GET";  enable_cors "$VER_ID"
  USR_ID=$(create_res "$AUTH_ID" "user");     enable_cors "$USR_ID"
  USR_ID_ID=$(create_res "$USR_ID" "{id}");   create_method "$USR_ID_ID" "GET"; create_method "$USR_ID_ID" "PUT"; enable_cors "$USR_ID_ID"

  # Create Gemini API routes if function exists
  if [[ -n "$GEMINI_FUNCTION_ARN" ]]; then
    log "Creating /gemini tree"
    GEMINI_ID=$(create_res "$ROOT_ID" "gemini"); enable_cors "$GEMINI_ID"
    
    # Create {proxy+} resource for catch-all routing
    GEMINI_PROXY_ID=$(create_res "$GEMINI_ID" "{proxy+}"); enable_cors "$GEMINI_PROXY_ID"
    
    # Add all HTTP methods to the proxy resource
    create_method "$GEMINI_PROXY_ID" "GET" "$GEMINI_FUNCTION_ARN" "$GEMINI_FUNCTION_NAME"
    create_method "$GEMINI_PROXY_ID" "POST" "$GEMINI_FUNCTION_ARN" "$GEMINI_FUNCTION_NAME"
    create_method "$GEMINI_PROXY_ID" "PUT" "$GEMINI_FUNCTION_ARN" "$GEMINI_FUNCTION_NAME"
    create_method "$GEMINI_PROXY_ID" "DELETE" "$GEMINI_FUNCTION_ARN" "$GEMINI_FUNCTION_NAME"
    
    log "✅ Gemini proxy endpoints created:"
    log "  POST /gemini/generate-content"
    log "  POST /gemini/discover-documents"
    log "  POST /gemini/enhance-section"
  else
    warn "Skipping /gemini endpoints - function not deployed"
  fi

  log "Deploying stage $STAGE_NAME"
  DEPLOY_DESCRIPTION="Auth + Gemini deploy $(date)"
  if [[ -z "$GEMINI_FUNCTION_ARN" ]]; then
    DEPLOY_DESCRIPTION="Auth deploy $(date)"
  fi
  DEPLOY_ID=$(aws apigateway create-deployment --rest-api-id "$API_ID" --region "$AWS_REGION" --stage-name "$STAGE_NAME" --description "$DEPLOY_DESCRIPTION" --query 'id' --output text)
  log "Deployment: $DEPLOY_ID"

  API_BASE_URL="https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${STAGE_NAME}"

elif [[ "$API_TYPE" == "HTTP" ]]; then
  # --- HTTP API (v2) routes ---
  log "Ensuring stage $STAGE_NAME"
  if ! aws apigatewayv2 get-stage --api-id "$API_ID" --stage-name "$STAGE_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
    aws apigatewayv2 create-stage --api-id "$API_ID" --stage-name "$STAGE_NAME" --auto-deploy --region "$AWS_REGION" >/dev/null
  fi

  INTEG_ID=$(aws apigatewayv2 create-integration \
    --api-id "$API_ID" --region "$AWS_REGION" \
    --integration-type AWS_PROXY \
    --integration-uri "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${AUTH_FUNCTION_ARN}/invocations" \
    --payload-format-version "2.0" --query 'IntegrationId' --output text 2>/dev/null || true)

  # if integration already exists, find one to reuse
  if [[ -z "${INTEG_ID}" || "${INTEG_ID}" == "None" ]]; then
    INTEG_ID=$(aws apigatewayv2 get-integrations --api-id "$API_ID" --region "$AWS_REGION" \
      --query "Items[?IntegrationType=='AWS_PROXY' && contains(IntegrationUri, '${AUTH_FUNCTION_NAME}')].IntegrationId | [0]" \
      --output text)
  fi
  if [[ -z "$INTEG_ID" || "$INTEG_ID" == "None" ]]; then err "Failed to create or find integration"; exit 1; fi
  dbg "Using IntegrationId: $INTEG_ID"

  add_route () {
    local method="$1"; local path="$2"
    # create-route is idempotent by failing; swallow errors
    aws apigatewayv2 create-route --api-id "$API_ID" --region "$AWS_REGION" \
      --route-key "${method} ${path}" --target "integrations/${INTEG_ID}" >/dev/null 2>&1 || true
  }

  log "Creating HTTP routes - Auth"
  add_route "POST" "/auth/register"
  add_route "POST" "/auth/login"
  add_route "GET"  "/auth/verify"
  add_route "GET"  "/auth/user/{id}"
  add_route "PUT"  "/auth/user/{id}"

  # Create Gemini routes if function exists
  if [[ -n "$GEMINI_FUNCTION_ARN" ]]; then
    log "Creating HTTP routes - Gemini"
    
    # Create Gemini integration
    GEMINI_INTEG_ID=$(aws apigatewayv2 create-integration \
      --api-id "$API_ID" --region "$AWS_REGION" \
      --integration-type AWS_PROXY \
      --integration-uri "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${GEMINI_FUNCTION_ARN}/invocations" \
      --payload-format-version "2.0" --query 'IntegrationId' --output text 2>/dev/null || true)

    # If integration already exists, find one to reuse
    if [[ -z "${GEMINI_INTEG_ID}" || "${GEMINI_INTEG_ID}" == "None" ]]; then
      GEMINI_INTEG_ID=$(aws apigatewayv2 get-integrations --api-id "$API_ID" --region "$AWS_REGION" \
        --query "Items[?IntegrationType=='AWS_PROXY' && contains(IntegrationUri, '${GEMINI_FUNCTION_NAME}')].IntegrationId | [0]" \
        --output text)
    fi
    
    if [[ -n "$GEMINI_INTEG_ID" && "$GEMINI_INTEG_ID" != "None" ]]; then
      # Add Gemini proxy routes
      aws apigatewayv2 create-route --api-id "$API_ID" --region "$AWS_REGION" \
        --route-key "POST /gemini/{proxy+}" --target "integrations/${GEMINI_INTEG_ID}" >/dev/null 2>&1 || true
      aws apigatewayv2 create-route --api-id "$API_ID" --region "$AWS_REGION" \
        --route-key "GET /gemini/{proxy+}" --target "integrations/${GEMINI_INTEG_ID}" >/dev/null 2>&1 || true
      aws apigatewayv2 create-route --api-id "$API_ID" --region "$AWS_REGION" \
        --route-key "PUT /gemini/{proxy+}" --target "integrations/${GEMINI_INTEG_ID}" >/dev/null 2>&1 || true
      aws apigatewayv2 create-route --api-id "$API_ID" --region "$AWS_REGION" \
        --route-key "DELETE /gemini/{proxy+}" --target "integrations/${GEMINI_INTEG_ID}" >/dev/null 2>&1 || true
      aws apigatewayv2 create-route --api-id "$API_ID" --region "$AWS_REGION" \
        --route-key "OPTIONS /gemini/{proxy+}" --target "integrations/${GEMINI_INTEG_ID}" >/dev/null 2>&1 || true
      
      log "✅ Gemini HTTP routes created"
    else
      warn "Failed to create Gemini integration for HTTP API"
    fi
    
    # Lambda permission for Gemini
    aws lambda add-permission \
      --function-name "$GEMINI_FUNCTION_NAME" --region "$AWS_REGION" \
      --statement-id "apigwv2-gemini-${API_ID}-$(date +%s%N)" \
      --action lambda:InvokeFunction \
      --principal apigateway.amazonaws.com \
      --source-arn "arn:aws:execute-api:${AWS_REGION}:${ACCOUNT_ID}:${API_ID}/*" >/dev/null 2>&1 || true
  else
    warn "Skipping Gemini HTTP routes - function not deployed"
  fi

  # Lambda permission (cover all routes)
  aws lambda add-permission \
    --function-name "$AUTH_FUNCTION_NAME" --region "$AWS_REGION" \
    --statement-id "apigwv2-${API_ID}-$(date +%s%N)" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${AWS_REGION}:${ACCOUNT_ID}:${API_ID}/*" >/dev/null 2>&1 || true

  API_BASE_URL="https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${STAGE_NAME}"
else
  err "WebSocket API not supported by this script"; exit 1
fi

log "API Base URL: $API_BASE_URL"

# Quick health probes
probe () { curl -s -o /dev/null -w "%{http_code}" -X "$1" "$2" -H "Content-Type: application/json" -d '{}' || true; }
log "Probes:"
echo "POST /auth/register -> $(probe POST "$API_BASE_URL/auth/register")"
echo "POST /auth/login    -> $(probe POST "$API_BASE_URL/auth/login")"
echo "GET  /auth/verify   -> $(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/auth/verify" || true)"

# Probe Gemini endpoints if available
if [[ -n "$GEMINI_FUNCTION_ARN" ]]; then
  echo "POST /gemini/generate-content -> $(probe POST "$API_BASE_URL/gemini/generate-content")"
  echo "POST /gemini/discover-documents -> $(probe POST "$API_BASE_URL/gemini/discover-documents")"
  echo "POST /gemini/enhance-section -> $(probe POST "$API_BASE_URL/gemini/enhance-section")"
fi

# Emit one-shot metric
aws cloudwatch put-metric-data \
  --namespace "LearningAssistant/Deploy" \
  --metric-name "ApiDeploy" \
  --dimensions Account=$ACCOUNT_ID,ApiId=$API_ID,Stage=$STAGE_NAME,Type=$API_TYPE \
  --value 1 --region "$AWS_REGION" >/dev/null 2>&1 || true

log "Done."
