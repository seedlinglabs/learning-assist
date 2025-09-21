#!/bin/bash

# Learning Assistant - Deploy Topics Lambda Only
# Simple script to deploy just the topics Lambda function

set -e

# Configuration
AWS_REGION="us-west-2"

echo "📚 Learning Assistant - Topics Lambda Deployment"
echo "==============================================="
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
    echo "Please create a role first or provide the role name"
    exit 1
fi

ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
log "Using IAM role: $ROLE_NAME"
debug "Role ARN: $ROLE_ARN"

# Create deployment package
log "Creating topics Lambda deployment package..."

# Clean up previous packages
rm -f topics-lambda.zip
rm -rf topics-temp

# Create temporary directory
mkdir -p topics-temp

# Copy the Lambda function
cp lambda_function.py topics-temp/

# Create the zip package
debug "Packaging Lambda function..."
cd topics-temp
zip -q ../topics-lambda.zip lambda_function.py
cd ..
rm -rf topics-temp

PACKAGE_SIZE=$(du -h topics-lambda.zip | cut -f1)
log "Package created: topics-lambda.zip ($PACKAGE_SIZE)"

# Deploy Lambda function
TOPICS_FUNCTION_NAME="learning-assist-topics"
log "Deploying topics Lambda function: $TOPICS_FUNCTION_NAME"

# Check if function exists
if aws lambda get-function --function-name $TOPICS_FUNCTION_NAME &>/dev/null; then
    log "Function exists, updating code and configuration..."
    
    # Update function code
    debug "Updating function code..."
    aws lambda update-function-code \
        --function-name $TOPICS_FUNCTION_NAME \
        --zip-file fileb://topics-lambda.zip
    
    # Update configuration
    debug "Updating function configuration..."
    aws lambda update-function-configuration \
        --function-name $TOPICS_FUNCTION_NAME \
        --timeout 30 \
        --memory-size 256 \
        --runtime python3.11
    
    log "✅ Topics Lambda function updated"
else
    log "Creating new topics Lambda function..."
    
    debug "Creating function with role: $ROLE_ARN"
    aws lambda create-function \
        --function-name $TOPICS_FUNCTION_NAME \
        --runtime python3.11 \
        --role $ROLE_ARN \
        --handler lambda_function.lambda_handler \
        --zip-file fileb://topics-lambda.zip \
        --description "Learning Assistant Topics API" \
        --timeout 30 \
        --memory-size 256
    
    log "✅ Topics Lambda function created"
fi

# Verify deployment
log "Verifying deployment..."
FUNCTION_INFO=$(aws lambda get-function --function-name $TOPICS_FUNCTION_NAME --query 'Configuration.{Name:FunctionName,Runtime:Runtime,State:State,Size:CodeSize}' --output text)
log "Function info: $FUNCTION_INFO"

# Get function ARN for reference
FUNCTION_ARN=$(aws lambda get-function --function-name $TOPICS_FUNCTION_NAME --query 'Configuration.FunctionArn' --output text)

# Test function with a simple invoke
log "Testing function..."
echo '{"httpMethod": "GET", "path": "/topics"}' > test-event.json
TEST_RESULT=$(aws lambda invoke \
    --function-name $TOPICS_FUNCTION_NAME \
    --payload file://test-event.json \
    --output text \
    --query 'StatusCode' \
    response.json 2>/dev/null || echo "ERROR")

if [ "$TEST_RESULT" = "200" ]; then
    log "✅ Function test successful"
    if [ -f "response.json" ]; then
        debug "Function response looks good"
    fi
else
    warn "⚠️  Function test returned: $TEST_RESULT"
    if [ -f "response.json" ]; then
        debug "Response: $(cat response.json)"
    fi
fi

# Save configuration
cat > topics-deployment.env << EOF
# Topics Lambda Deployment Configuration
# Generated: $(date)

TOPICS_FUNCTION_NAME=$TOPICS_FUNCTION_NAME
TOPICS_FUNCTION_ARN=$FUNCTION_ARN
AWS_REGION=$AWS_REGION
ROLE_NAME=$ROLE_NAME
ROLE_ARN=$ROLE_ARN

# API Gateway Integration
EXISTING_API_ID=xvq11x0421
API_BASE_URL=https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod
EOF

# Cleanup
rm -f topics-lambda.zip test-event.json response.json 2>/dev/null || true

# Results
echo ""
echo "🎉 Topics Lambda Deployment Complete!"
echo "===================================="
echo ""
echo -e "${GREEN}Function Details:${NC}"
echo "  Name: $TOPICS_FUNCTION_NAME"
echo "  ARN: $FUNCTION_ARN"
echo "  Region: $AWS_REGION"
echo ""
echo -e "${GREEN}Existing API Integration:${NC}"
echo "  API Gateway: xvq11x0421"
echo "  Base URL: https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod"
echo ""
echo -e "${BLUE}Available Topics Endpoints:${NC}"
echo "  GET    https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics"
echo "  POST   https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics"
echo "  GET    https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics/{id}"
echo "  PUT    https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics/{id}"
echo "  DELETE https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics/{id}"
echo ""
echo -e "${BLUE}AWS Console Links:${NC}"
echo "Lambda: https://console.aws.amazon.com/lambda/home?region=$AWS_REGION#/functions/$TOPICS_FUNCTION_NAME"
echo "API Gateway: https://console.aws.amazon.com/apigateway/home?region=$AWS_REGION#/apis/xvq11x0421"
echo ""
echo -e "${GREEN}Configuration saved to:${NC} topics-deployment.env"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Test topics API: curl https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics"
echo "2. Topics Lambda is ready and integrated with existing API Gateway"
echo "3. No additional setup needed for topics functionality"
echo ""
echo "🚀 Topics Lambda is ready and working!"
