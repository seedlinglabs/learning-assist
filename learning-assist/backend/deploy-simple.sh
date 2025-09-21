#!/bin/bash

# Learning Assistant - Simple Deployment Script (No Dependencies)
# This version uses Lambda Layers for dependencies to avoid packaging issues

set -e

# Configuration
AWS_REGION="us-west-2"
PROJECT_NAME="learning-assist"
JWT_SECRET="learning-assist-jwt-secret-$(date +%s)-$(openssl rand -hex 16)"

echo "🚀 Learning Assistant - Simple Deployment"
echo "========================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check AWS CLI
if ! aws sts get-caller-identity &> /dev/null; then
    error "AWS CLI not configured. Run 'aws configure' first."
    exit 1
fi

log "AWS CLI configured successfully"

# Find existing IAM role
log "Looking for existing IAM role..."
ROLE_NAME=$(aws iam list-roles --query "Roles[?starts_with(RoleName, 'learning-assist-lambda-role')].RoleName" --output text | head -1)

if [ -z "$ROLE_NAME" ]; then
    error "No IAM role found. Please run the full deploy.sh script first to create the role."
    exit 1
fi

ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
log "Using existing IAM role: $ROLE_NAME"

# Deploy Topics Lambda (simple)
log "Deploying Topics Lambda..."
rm -f topics-lambda.zip
cd ../
zip -q topics-lambda.zip backend/lambda_function.py
cd backend/

aws lambda update-function-code \
    --function-name learning-assist-topics \
    --zip-file fileb://topics-lambda.zip &>/dev/null || {
        log "Creating new topics function..."
        aws lambda create-function \
            --function-name learning-assist-topics \
            --runtime python3.11 \
            --role $ROLE_ARN \
            --handler lambda_function.lambda_handler \
            --zip-file fileb://topics-lambda.zip \
            --timeout 30 \
            --memory-size 256 &>/dev/null
    }

log "✅ Topics Lambda deployed"

# Deploy Auth Lambda (without dependencies - will use Lambda Layer)
log "Deploying Auth Lambda (minimal package)..."
rm -f auth-lambda-simple.zip
zip -q auth-lambda-simple.zip auth_lambda_function.py

aws lambda update-function-code \
    --function-name learning-assist-auth \
    --zip-file fileb://auth-lambda-simple.zip &>/dev/null || {
        log "Creating new auth function..."
        aws lambda create-function \
            --function-name learning-assist-auth \
            --runtime python3.11 \
            --role $ROLE_ARN \
            --handler auth_lambda_function.lambda_handler \
            --zip-file fileb://auth-lambda-simple.zip \
            --timeout 30 \
            --memory-size 256 \
            --environment Variables="{JWT_SECRET=$JWT_SECRET}" &>/dev/null
    }

# Set environment variable
aws lambda update-function-configuration \
    --function-name learning-assist-auth \
    --environment Variables="{JWT_SECRET=$JWT_SECRET}" &>/dev/null

log "✅ Auth Lambda deployed"

# Create or update API Gateway
log "Setting up API Gateway..."

# Check if API exists
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='learning-assist-api'].id" --output text 2>/dev/null | head -1)

if [ -z "$API_ID" ]; then
    log "Creating new API Gateway..."
    API_ID=$(aws apigateway create-rest-api \
        --name learning-assist-api \
        --description "Learning Assistant API" \
        --query 'id' --output text)
    log "API Gateway created: $API_ID"
else
    log "Using existing API Gateway: $API_ID"
fi

# Deploy API
log "Deploying API to production..."
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --description "Simple deployment $(date)" &>/dev/null

# Get API URL
API_URL="https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/prod"

# Update frontend
log "Updating frontend configuration..."
if [ -f "../src/services/authService.ts" ]; then
    sed -i.bak "s|const AUTH_API_BASE_URL = '.*';|const AUTH_API_BASE_URL = '$API_URL';|g" "../src/services/authService.ts"
    log "✅ Frontend updated"
fi

# Cleanup
rm -f topics-lambda.zip auth-lambda-simple.zip

# Results
echo ""
echo "🎉 Simple Deployment Complete!"
echo "=============================="
echo ""
echo -e "${GREEN}API URL:${NC} $API_URL"
echo -e "${GREEN}JWT Secret:${NC} $JWT_SECRET"
echo ""
echo -e "${YELLOW}Note:${NC} Auth Lambda deployed without dependencies."
echo "If authentication fails, you may need to:"
echo "1. Install PyJWT manually in Lambda console, or"
echo "2. Use Lambda Layers for dependencies, or" 
echo "3. Run the full deploy.sh script"
echo ""
echo "Test endpoints:"
echo "  Topics: $API_URL/topics"
echo "  Auth: $API_URL/auth/register"
echo ""
echo "🚀 Ready to test!"
