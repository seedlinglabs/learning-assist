#!/bin/bash

# Learning Assistant - Deploy Auth Lambda Only
# Simple script to deploy just the authentication Lambda function

set -e

# Configuration
AWS_REGION="us-west-2"
JWT_SECRET="learning-assist-jwt-secret-$(date +%s)-$(openssl rand -hex 8)"

echo "🔐 Learning Assistant - Auth Lambda Deployment"
echo "============================================="
echo "Region: $AWS_REGION"
echo ""

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

# Check AWS access
log "Checking AWS access..."
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
log "AWS Account: $ACCOUNT_ID"

# Find existing IAM role
log "Finding IAM role..."
ROLE_NAME=$(aws iam list-roles --query "Roles[?starts_with(RoleName, 'learning-assist-lambda-role')].RoleName" --output text | head -1)

if [ -z "$ROLE_NAME" ]; then
    error "No IAM role found with pattern 'learning-assist-lambda-role'"
    echo "Available roles:"
    aws iam list-roles --query "Roles[].RoleName" --output text | grep -E "(lambda|learning)" || echo "No matching roles found"
    echo ""
    echo "Please create a role first or provide the role name:"
    echo "aws iam create-role --role-name learning-assist-lambda-role --assume-role-policy-document file://trust-policy.json"
    exit 1
fi

ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
log "Using IAM role: $ROLE_NAME"
debug "Role ARN: $ROLE_ARN"

# Create deployment package
log "Creating auth Lambda deployment package..."

# Clean up previous packages
rm -f auth-lambda.zip
rm -rf auth-temp

# Create temporary directory
mkdir -p auth-temp

# Copy the Lambda function
cp auth_lambda_function.py auth-temp/

# Create the zip package
debug "Packaging Lambda function..."
cd auth-temp
zip -q ../auth-lambda.zip auth_lambda_function.py
cd ..
rm -rf auth-temp

PACKAGE_SIZE=$(du -h auth-lambda.zip | cut -f1)
log "Package created: auth-lambda.zip ($PACKAGE_SIZE)"

# Deploy Lambda function
AUTH_FUNCTION_NAME="learning-assist-auth"
log "Deploying auth Lambda function: $AUTH_FUNCTION_NAME"

# Check if function exists
if aws lambda get-function --function-name $AUTH_FUNCTION_NAME &>/dev/null; then
    log "Function exists, updating code and configuration..."
    
    # Update function code
    debug "Updating function code..."
    aws lambda update-function-code \
        --function-name $AUTH_FUNCTION_NAME \
        --zip-file fileb://auth-lambda.zip
    
    # Update environment variables
    debug "Updating environment variables..."
    aws lambda update-function-configuration \
        --function-name $AUTH_FUNCTION_NAME \
        --environment Variables="{JWT_SECRET=$JWT_SECRET}" \
        --timeout 30 \
        --memory-size 256
    
    log "✅ Auth Lambda function updated"
else
    log "Creating new auth Lambda function..."
    
    debug "Creating function with role: $ROLE_ARN"
    aws lambda create-function \
        --function-name $AUTH_FUNCTION_NAME \
        --runtime python3.11 \
        --role $ROLE_ARN \
        --handler auth_lambda_function.lambda_handler \
        --zip-file fileb://auth-lambda.zip \
        --description "Learning Assistant Authentication API" \
        --timeout 30 \
        --memory-size 256 \
        --environment Variables="{JWT_SECRET=$JWT_SECRET}"
    
    log "✅ Auth Lambda function created"
fi

# Verify deployment
log "Verifying deployment..."
FUNCTION_INFO=$(aws lambda get-function --function-name $AUTH_FUNCTION_NAME --query 'Configuration.{Name:FunctionName,Runtime:Runtime,State:State,Size:CodeSize}' --output text)
log "Function info: $FUNCTION_INFO"

# Get function ARN for reference
FUNCTION_ARN=$(aws lambda get-function --function-name $AUTH_FUNCTION_NAME --query 'Configuration.FunctionArn' --output text)

# Save configuration
cat > auth-deployment.env << EOF
# Auth Lambda Deployment Configuration
# Generated: $(date)

AUTH_FUNCTION_NAME=$AUTH_FUNCTION_NAME
AUTH_FUNCTION_ARN=$FUNCTION_ARN
JWT_SECRET=$JWT_SECRET
AWS_REGION=$AWS_REGION
ROLE_NAME=$ROLE_NAME
ROLE_ARN=$ROLE_ARN
EOF

# Cleanup
rm -f auth-lambda.zip

# Results
echo ""
echo "🎉 Auth Lambda Deployment Complete!"
echo "===================================="
echo ""
echo -e "${GREEN}Function Details:${NC}"
echo "  Name: $AUTH_FUNCTION_NAME"
echo "  ARN: $FUNCTION_ARN"
echo "  Region: $AWS_REGION"
echo ""
echo -e "${GREEN}Security:${NC}"
echo "  JWT Secret: $JWT_SECRET"
echo ""
echo -e "${YELLOW}⚠️  Dependencies Note:${NC}"
echo "The function is deployed without PyJWT/cryptography dependencies."
echo "To add dependencies, choose one of these options:"
echo ""
echo -e "${BLUE}Option 1 - Lambda Console:${NC}"
echo "1. Go to: https://console.aws.amazon.com/lambda/home?region=$AWS_REGION#/functions/$AUTH_FUNCTION_NAME"
echo "2. Upload a new deployment package with dependencies"
echo ""
echo -e "${BLUE}Option 2 - Use Lambda Layer:${NC}"
echo "1. Create a layer with PyJWT and cryptography"
echo "2. Attach the layer to this function"
echo ""
echo -e "${BLUE}Option 3 - Manual pip install:${NC}"
echo "pip3 install PyJWT cryptography -t temp_package/"
echo "cp auth_lambda_function.py temp_package/"
echo "cd temp_package && zip -r ../auth-with-deps.zip . && cd .."
echo "aws lambda update-function-code --function-name $AUTH_FUNCTION_NAME --zip-file fileb://auth-with-deps.zip"
echo ""
echo -e "${GREEN}Configuration saved to:${NC} auth-deployment.env"
echo ""
echo "🚀 Auth Lambda is ready for API Gateway integration!"
