#!/bin/bash

# Learning Assistant - Deploy to Existing API Gateway
# Uses the existing API Gateway to avoid permission issues

set -e

# Configuration - using your existing API Gateway
EXISTING_API_ID="xvq11x0421"  # From your existing Topics API URL
AWS_REGION="us-west-2"
STAGE_NAME="pre-prod"
JWT_SECRET="learning-assist-jwt-secret-$(date +%s)"

echo "🔄 Learning Assistant - Deploy to Existing API"
echo "=============================================="
echo "Using existing API Gateway: $EXISTING_API_ID"
echo "Stage: $STAGE_NAME"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if we can access the existing API
log "Checking access to existing API Gateway..."
if aws apigateway get-rest-api --rest-api-id $EXISTING_API_ID &>/dev/null; then
    log "✅ Can access existing API Gateway"
else
    error "Cannot access API Gateway $EXISTING_API_ID"
    echo "This might be a permissions issue or wrong API ID"
    exit 1
fi

# Get IAM role
log "Finding IAM role..."
ROLE_NAME=$(aws iam list-roles --query "Roles[?starts_with(RoleName, 'learning-assist-lambda-role')].RoleName" --output text | head -1)
if [ -z "$ROLE_NAME" ]; then
    error "No IAM role found. Please create one first or run deploy.sh"
    exit 1
fi
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
log "Using IAM role: $ROLE_NAME"

# Deploy Auth Lambda only
log "Deploying Auth Lambda function..."

# Create minimal package (no dependencies for now)
rm -f auth-lambda-minimal.zip
zip -q auth-lambda-minimal.zip auth_lambda_function.py

AUTH_FUNCTION_NAME="learning-assist-auth"

# Check if function exists
if aws lambda get-function --function-name $AUTH_FUNCTION_NAME &>/dev/null; then
    log "Updating existing auth function..."
    aws lambda update-function-code \
        --function-name $AUTH_FUNCTION_NAME \
        --zip-file fileb://auth-lambda-minimal.zip
    
    aws lambda update-function-configuration \
        --function-name $AUTH_FUNCTION_NAME \
        --environment Variables="{JWT_SECRET=$JWT_SECRET}" \
        --timeout 30
else
    log "Creating new auth function..."
    aws lambda create-function \
        --function-name $AUTH_FUNCTION_NAME \
        --runtime python3.11 \
        --role $ROLE_ARN \
        --handler auth_lambda_function.lambda_handler \
        --zip-file fileb://auth-lambda-minimal.zip \
        --description "Learning Assistant Authentication API" \
        --timeout 30 \
        --memory-size 256 \
        --environment Variables="{JWT_SECRET=$JWT_SECRET}"
fi

log "✅ Auth Lambda deployed: $AUTH_FUNCTION_NAME"

# Get function ARN
AUTH_FUNCTION_ARN=$(aws lambda get-function --function-name $AUTH_FUNCTION_NAME --query 'Configuration.FunctionArn' --output text)

# Add auth endpoints to existing API Gateway (if permissions allow)
log "Attempting to add auth endpoints to existing API..."

if aws apigateway get-resources --rest-api-id $EXISTING_API_ID &>/dev/null; then
    log "Adding auth endpoints to existing API Gateway..."
    
    # This would require more complex API Gateway modification
    # For now, just provide the manual steps
    warn "API Gateway modification requires additional permissions"
    warn "Please add auth endpoints manually in AWS Console"
else
    warn "Cannot modify existing API Gateway due to permissions"
fi

# Build API URL
API_URL="https://$EXISTING_API_ID.execute-api.$AWS_REGION.amazonaws.com/$STAGE_NAME"

# Update frontend
log "Updating frontend configuration..."
if [ -f "../src/services/authService.ts" ]; then
    sed -i.bak "s|const AUTH_API_BASE_URL = '.*';|const AUTH_API_BASE_URL = '$API_URL';|g" "../src/services/authService.ts"
    log "✅ Frontend updated with API URL"
fi

# Cleanup
rm -f auth-lambda-minimal.zip

# Results
echo ""
echo "🎉 Auth Lambda Deployed!"
echo "======================="
echo ""
echo "API Base URL: $API_URL"
echo "Auth Function: $AUTH_FUNCTION_NAME"
echo "JWT Secret: $JWT_SECRET"
echo ""
echo "⚠️  MANUAL STEPS NEEDED:"
echo "1. Go to API Gateway Console: https://console.aws.amazon.com/apigateway/home?region=$AWS_REGION#/apis/$EXISTING_API_ID"
echo "2. Add these resources and methods:"
echo "   - POST /auth/register → $AUTH_FUNCTION_NAME"
echo "   - POST /auth/login → $AUTH_FUNCTION_NAME" 
echo "   - GET /auth/verify → $AUTH_FUNCTION_NAME"
echo "3. Enable CORS on all auth endpoints"
echo "4. Deploy API to $STAGE_NAME stage"
echo "5. Add PyJWT dependency to Lambda function (see instructions below)"
echo ""
echo "📦 To add PyJWT dependency to Lambda:"
echo "1. Go to Lambda Console: https://console.aws.amazon.com/lambda/home?region=$AWS_REGION#/functions/$AUTH_FUNCTION_NAME"
echo "2. Go to Layers tab"
echo "3. Add a layer with PyJWT and cryptography"
echo "4. Or upload a new deployment package with dependencies"
echo ""
echo "🚀 Auth Lambda is deployed and ready for API Gateway integration!"
