#!/bin/bash

# Learning Assistant - Debug Deployment Script
# Step-by-step deployment with detailed output

set -e

# Configuration
AWS_REGION="us-west-2"
PROJECT_NAME="learning-assist"

echo "🔍 Learning Assistant - Debug Deployment"
echo "======================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
debug() { echo -e "${BLUE}[DEBUG]${NC} $1"; }

# Check AWS CLI
log "Checking AWS configuration..."
aws sts get-caller-identity
echo ""

# Step 1: Check existing resources
log "Checking existing Lambda functions..."
aws lambda list-functions --query "Functions[?starts_with(FunctionName, 'learning-assist')].{Name:FunctionName,Runtime:Runtime,State:State}" --output table

echo ""
log "Checking existing API Gateways..."
aws apigateway get-rest-apis --query "items[?starts_with(name, 'learning-assist')].{Name:name,Id:id}" --output table

echo ""
log "Checking IAM roles..."
aws iam list-roles --query "Roles[?starts_with(RoleName, 'learning-assist-lambda-role')].{Name:RoleName,Arn:Arn}" --output table

# Step 2: Get or create role
echo ""
log "Getting IAM role ARN..."
ROLE_NAME=$(aws iam list-roles --query "Roles[?starts_with(RoleName, 'learning-assist-lambda-role')].RoleName" --output text | head -1)

if [ -z "$ROLE_NAME" ]; then
    error "No IAM role found. Creating one..."
    
    # Create trust policy
    cat > lambda-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
    
    # Create role
    BASE_ROLE_NAME="learning-assist-lambda-role"
    aws iam create-role \
        --role-name $BASE_ROLE_NAME \
        --assume-role-policy-document file://lambda-trust-policy.json \
        --description "Role for Learning Assistant Lambda functions"
    
    # Attach policies
    aws iam attach-role-policy \
        --role-name $BASE_ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    
    aws iam attach-role-policy \
        --role-name $BASE_ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
    
    ROLE_NAME=$BASE_ROLE_NAME
    log "IAM role created: $ROLE_NAME"
    
    # Wait for propagation
    log "Waiting 15 seconds for role propagation..."
    sleep 15
fi

ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
log "Using IAM role: $ROLE_ARN"

# Step 3: Deploy Topics Lambda (verbose)
echo ""
log "Deploying Topics Lambda function..."

# Create package
debug "Creating topics package..."
rm -f topics-lambda.zip
cd ../
zip -q topics-lambda.zip backend/lambda_function.py
cd backend/
debug "Package created: $(ls -lh topics-lambda.zip)"

# Deploy function
debug "Deploying to AWS Lambda..."
TOPICS_FUNCTION_NAME="learning-assist-topics"

if aws lambda get-function --function-name $TOPICS_FUNCTION_NAME &>/dev/null; then
    log "Updating existing topics function..."
    aws lambda update-function-code \
        --function-name $TOPICS_FUNCTION_NAME \
        --zip-file fileb://topics-lambda.zip
else
    log "Creating new topics function..."
    aws lambda create-function \
        --function-name $TOPICS_FUNCTION_NAME \
        --runtime python3.11 \
        --role $ROLE_ARN \
        --handler lambda_function.lambda_handler \
        --zip-file fileb://topics-lambda.zip \
        --description "Learning Assistant Topics API" \
        --timeout 30 \
        --memory-size 256
fi

log "✅ Topics Lambda deployed successfully"

# Step 4: Deploy Auth Lambda (minimal, no dependencies)
echo ""
log "Deploying Auth Lambda function (without dependencies)..."

debug "Creating minimal auth package..."
rm -f auth-lambda-minimal.zip
zip -q auth-lambda-minimal.zip auth_lambda_function.py
debug "Minimal package created: $(ls -lh auth-lambda-minimal.zip)"

AUTH_FUNCTION_NAME="learning-assist-auth"
JWT_SECRET="learning-assist-jwt-secret-$(date +%s)"

if aws lambda get-function --function-name $AUTH_FUNCTION_NAME &>/dev/null; then
    log "Updating existing auth function..."
    aws lambda update-function-code \
        --function-name $AUTH_FUNCTION_NAME \
        --zip-file fileb://auth-lambda-minimal.zip
    
    aws lambda update-function-configuration \
        --function-name $AUTH_FUNCTION_NAME \
        --environment Variables="{JWT_SECRET=$JWT_SECRET}"
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

log "✅ Auth Lambda deployed (dependencies needed separately)"

# Step 5: Quick API Gateway setup
echo ""
log "Setting up API Gateway..."

# Check if API exists
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='learning-assist-api'].id" --output text 2>/dev/null | head -1)

if [ -z "$API_ID" ] || [ "$API_ID" = "None" ]; then
    log "Creating new API Gateway..."
    API_ID=$(aws apigateway create-rest-api \
        --name learning-assist-api \
        --description "Learning Assistant API Gateway" \
        --endpoint-configuration types=REGIONAL \
        --query 'id' --output text)
    log "API Gateway created: $API_ID"
else
    log "Using existing API Gateway: $API_ID"
fi

# Simple deployment
log "Deploying API..."
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --description "Debug deployment $(date)" &>/dev/null

API_URL="https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/prod"

# Update frontend
if [ -f "../src/services/authService.ts" ]; then
    sed -i.bak "s|const AUTH_API_BASE_URL = '.*';|const AUTH_API_BASE_URL = '$API_URL';|g" "../src/services/authService.ts"
    log "Frontend configuration updated"
fi

# Cleanup
rm -f topics-lambda.zip auth-lambda-minimal.zip lambda-trust-policy.json

# Results
echo ""
echo "🎉 Debug Deployment Complete!"
echo "============================="
echo ""
echo -e "${BLUE}API Gateway URL:${NC} $API_URL"
echo -e "${BLUE}JWT Secret:${NC} $JWT_SECRET"
echo ""
echo -e "${GREEN}Lambda Functions:${NC}"
echo "  📚 Topics: $TOPICS_FUNCTION_NAME"
echo "  🔐 Auth: $AUTH_FUNCTION_NAME"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Test Topics API: curl $API_URL/topics"
echo "2. For Auth API to work, add PyJWT dependency to Lambda"
echo "3. Or use Lambda Layers for Python dependencies"
echo ""
echo -e "${BLUE}AWS Console Links:${NC}"
echo "Lambda: https://console.aws.amazon.com/lambda/home?region=$AWS_REGION"
echo "API Gateway: https://console.aws.amazon.com/apigateway/home?region=$AWS_REGION#/apis/$API_ID"
echo ""
echo "🚀 Basic deployment successful!"
