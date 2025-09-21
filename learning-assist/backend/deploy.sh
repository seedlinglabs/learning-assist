#!/bin/bash

# Learning Assistant - AWS Deployment Script
# This script deploys Lambda functions and API Gateway for the Learning Assistant application

set -e  # Exit on any error

# Configuration
AWS_REGION="us-west-2"
PROJECT_NAME="learning-assist"
JWT_SECRET="learning-assist-jwt-secret-$(date +%s)-$(openssl rand -hex 16)"

echo "🚀 Starting Learning Assistant AWS Deployment"
echo "================================================"
echo "Region: $AWS_REGION"
echo "Project: $PROJECT_NAME"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function for colored output
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
if ! command -v aws &> /dev/null; then
    error "AWS CLI is not installed. Please install it first."
    exit 1
fi

if ! command -v jq &> /dev/null; then
    warn "jq is not installed. Using fallback JSON parsing."
    echo "  For better JSON parsing, install jq:"
    echo "  macOS: brew install jq"
    echo "  Ubuntu: sudo apt-get install jq"
fi

# Check if user is logged in to AWS
if ! aws sts get-caller-identity &> /dev/null; then
    error "AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

log "AWS CLI configured successfully"

# Step 1: Create IAM Role for Lambda
log "Creating IAM role for Lambda functions..."

# Create trust policy for Lambda
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

# Create IAM role (AWS may append random suffix)
BASE_ROLE_NAME="${PROJECT_NAME}-lambda-role"

# Try to create the role, capture the actual name created
ROLE_CREATION_OUTPUT=$(aws iam create-role \
    --role-name $BASE_ROLE_NAME \
    --assume-role-policy-document file://lambda-trust-policy.json \
    --description "Role for Learning Assistant Lambda functions" \
    2>/dev/null) || true

if [ -n "$ROLE_CREATION_OUTPUT" ]; then
    # New role created, get the actual name
    if command -v jq &> /dev/null; then
        ACTUAL_ROLE_NAME=$(echo $ROLE_CREATION_OUTPUT | jq -r '.Role.RoleName')
    else
        # Fallback: extract role name using grep and sed
        ACTUAL_ROLE_NAME=$(echo $ROLE_CREATION_OUTPUT | grep -o '"RoleName": *"[^"]*"' | sed 's/"RoleName": *"//' | sed 's/"//')
    fi
    log "Created new IAM role: $ACTUAL_ROLE_NAME"
else
    # Role might exist, find it by pattern
    ACTUAL_ROLE_NAME=$(aws iam list-roles \
        --query "Roles[?starts_with(RoleName, '$BASE_ROLE_NAME')].RoleName" \
        --output text | head -1)
    
    if [ -z "$ACTUAL_ROLE_NAME" ]; then
        error "Could not find or create IAM role with pattern: $BASE_ROLE_NAME"
        exit 1
    fi
    warn "Using existing IAM role: $ACTUAL_ROLE_NAME"
fi

# Attach policies to the actual role
aws iam attach-role-policy \
    --role-name $ACTUAL_ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
    2>/dev/null || true

aws iam attach-role-policy \
    --role-name $ACTUAL_ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess \
    2>/dev/null || true

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name $ACTUAL_ROLE_NAME --query 'Role.Arn' --output text)
log "IAM Role created: $ROLE_ARN"

# Wait for role to be available
log "Waiting for IAM role to propagate..."
sleep 10

# Step 2: Create Lambda Functions

# Function 1: Topics Lambda
log "Creating Topics Lambda function..."

# Create deployment package for topics
rm -f topics-lambda.zip
cd ../
zip -r backend/topics-lambda.zip backend/lambda_function.py
cd backend/

TOPICS_FUNCTION_NAME="${PROJECT_NAME}-topics"
aws lambda create-function \
    --function-name $TOPICS_FUNCTION_NAME \
    --runtime python3.11 \
    --role $ROLE_ARN \
    --handler lambda_function.lambda_handler \
    --zip-file fileb://topics-lambda.zip \
    --description "Learning Assistant Topics API" \
    --timeout 30 \
    --memory-size 256 \
    2>/dev/null || {
        log "Topics function exists, updating code..."
        aws lambda update-function-code \
            --function-name $TOPICS_FUNCTION_NAME \
            --zip-file fileb://topics-lambda.zip
    }

log "Topics Lambda function deployed: $TOPICS_FUNCTION_NAME"

# Function 2: Auth Lambda
log "Creating Auth Lambda function..."

# Create deployment package for auth with dependencies
log "Installing Python dependencies for auth Lambda..."
rm -rf auth-package auth-lambda.zip
mkdir -p auth-package

# Install dependencies to package directory
log "Installing PyJWT and cryptography for auth Lambda..."

# Check if requirements.txt exists
if [ ! -f "requirements.txt" ]; then
    error "requirements.txt not found. Creating it..."
    cat > requirements.txt << EOF
boto3==1.34.0
PyJWT==2.8.0
cryptography==41.0.7
EOF
fi

# Try different pip installation methods with timeout and verbose output
echo "Attempting to install dependencies..."

# Method 1: Platform-specific (best for Lambda)
echo "Trying platform-specific installation..."
if timeout 60 pip3 install -r requirements.txt -t auth-package/ --no-deps --platform linux_x86_64 --only-binary=:all: --quiet; then
    log "Dependencies installed with platform-specific options"
elif timeout 60 pip3 install -r requirements.txt -t auth-package/ --quiet; then
    log "Dependencies installed with basic pip3"
elif timeout 60 python3 -m pip install -r requirements.txt -t auth-package/ --quiet; then
    log "Dependencies installed with python3 -m pip"
else
    warn "Pip installation failed or timed out. Trying alternative approach..."
    
    # Alternative: Install specific packages individually
    echo "Installing packages individually..."
    pip3 install PyJWT==2.8.0 -t auth-package/ --quiet 2>/dev/null || echo "PyJWT install failed"
    pip3 install cryptography==41.0.7 -t auth-package/ --quiet 2>/dev/null || echo "cryptography install failed"
    pip3 install boto3==1.34.0 -t auth-package/ --quiet 2>/dev/null || echo "boto3 install failed"
    
    if [ ! -d "auth-package/jwt" ]; then
        error "Failed to install critical dependencies. Auth Lambda will not work."
        echo "Please manually install: pip3 install PyJWT cryptography boto3"
        exit 1
    fi
fi

# Verify key dependencies were installed
if [ ! -d "auth-package/jwt" ]; then
    error "PyJWT not installed correctly. Auth Lambda will fail."
    echo "Please manually install: pip3 install PyJWT"
    exit 1
fi

log "Python dependencies installed successfully"

# Copy Lambda function to package
cp auth_lambda_function.py auth-package/

# Create deployment zip
cd auth-package
zip -r ../auth-lambda.zip . -x "*.pyc" "*/__pycache__/*"
cd ..

log "Auth Lambda package created with dependencies"

AUTH_FUNCTION_NAME="${PROJECT_NAME}-auth"

# Check if zip file was created successfully
if [ ! -f "auth-lambda.zip" ]; then
    error "auth-lambda.zip not found. Package creation failed."
    exit 1
fi

log "Deploying auth Lambda function with $(du -h auth-lambda.zip | cut -f1) package..."

# Create or update the Lambda function
AUTH_CREATION_OUTPUT=$(aws lambda create-function \
    --function-name $AUTH_FUNCTION_NAME \
    --runtime python3.11 \
    --role $ROLE_ARN \
    --handler auth_lambda_function.lambda_handler \
    --zip-file fileb://auth-lambda.zip \
    --description "Learning Assistant Authentication API" \
    --timeout 30 \
    --memory-size 256 \
    --environment Variables="{JWT_SECRET=$JWT_SECRET}" \
    2>&1) || {
        if echo "$AUTH_CREATION_OUTPUT" | grep -q "ResourceConflictException"; then
            log "Auth function exists, updating code and configuration..."
            aws lambda update-function-code \
                --function-name $AUTH_FUNCTION_NAME \
                --zip-file fileb://auth-lambda.zip
            aws lambda update-function-configuration \
                --function-name $AUTH_FUNCTION_NAME \
                --environment Variables="{JWT_SECRET=$JWT_SECRET}"
        else
            error "Failed to create auth Lambda function:"
            echo "$AUTH_CREATION_OUTPUT"
            exit 1
        fi
    }

log "Auth Lambda function deployed: $AUTH_FUNCTION_NAME"

# Verify both functions exist
log "Verifying Lambda functions..."
TOPICS_EXISTS=$(aws lambda get-function --function-name $TOPICS_FUNCTION_NAME --query 'Configuration.FunctionName' --output text 2>/dev/null || echo "NOT_FOUND")
AUTH_EXISTS=$(aws lambda get-function --function-name $AUTH_FUNCTION_NAME --query 'Configuration.FunctionName' --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$TOPICS_EXISTS" = "NOT_FOUND" ]; then
    error "Topics Lambda function not found after deployment!"
    exit 1
else
    log "✅ Topics Lambda verified: $TOPICS_EXISTS"
fi

if [ "$AUTH_EXISTS" = "NOT_FOUND" ]; then
    error "Auth Lambda function not found after deployment!"
    exit 1
else
    log "✅ Auth Lambda verified: $AUTH_EXISTS"
fi

# Get function ARNs
TOPICS_FUNCTION_ARN=$(aws lambda get-function --function-name $TOPICS_FUNCTION_NAME --query 'Configuration.FunctionArn' --output text)
AUTH_FUNCTION_ARN=$(aws lambda get-function --function-name $AUTH_FUNCTION_NAME --query 'Configuration.FunctionArn' --output text)

log "Function ARNs retrieved successfully"

# Step 3: Create API Gateway
log "Creating API Gateway..."

# Create REST API
API_NAME="${PROJECT_NAME}-api"
API_ID=$(aws apigateway create-rest-api \
    --name $API_NAME \
    --description "Learning Assistant API Gateway" \
    --endpoint-configuration types=REGIONAL \
    --query 'id' --output text 2>/dev/null || {
        # If API exists, get its ID
        aws apigateway get-rest-apis \
            --query "items[?name=='$API_NAME'].id" \
            --output text
    })

log "API Gateway created: $API_ID"

# Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --query 'items[?path==`/`].id' \
    --output text)

# Step 4: Create API Resources and Methods

# Helper function to create resource
create_resource() {
    local parent_id=$1
    local path_part=$2
    local resource_name=$3
    
    log "Creating resource: /$resource_name"
    
    aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $parent_id \
        --path-part $path_part \
        --query 'id' --output text 2>/dev/null || {
            # If resource exists, get its ID
            aws apigateway get-resources \
                --rest-api-id $API_ID \
                --query "items[?pathPart=='$path_part'].id" \
                --output text
        }
}

# Helper function to create method
create_method() {
    local resource_id=$1
    local http_method=$2
    local function_arn=$3
    local function_name=$4
    
    log "Creating method: $http_method"
    
    # Create method
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $resource_id \
        --http-method $http_method \
        --authorization-type NONE \
        --no-api-key-required 2>/dev/null || true
    
    # Create integration
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $resource_id \
        --http-method $http_method \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri arn:aws:apigateway:$AWS_REGION:lambda:path/2015-03-31/functions/$function_arn/invocations 2>/dev/null || true
    
    # Add Lambda permission
    aws lambda add-permission \
        --function-name $function_name \
        --statement-id "${function_name}-${http_method}-$(date +%s)" \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:$AWS_REGION:*:$API_ID/*/$http_method/*" \
        2>/dev/null || true
}

# Helper function to enable CORS
enable_cors() {
    local resource_id=$1
    
    # Create OPTIONS method for CORS
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $resource_id \
        --http-method OPTIONS \
        --authorization-type NONE \
        --no-api-key-required 2>/dev/null || true
    
    # Create mock integration for OPTIONS
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $resource_id \
        --http-method OPTIONS \
        --type MOCK \
        --request-templates '{"application/json": "{\"statusCode\": 200}"}' 2>/dev/null || true
    
    # Create method response for OPTIONS
    aws apigateway put-method-response \
        --rest-api-id $API_ID \
        --resource-id $resource_id \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters method.response.header.Access-Control-Allow-Headers=false,method.response.header.Access-Control-Allow-Methods=false,method.response.header.Access-Control-Allow-Origin=false 2>/dev/null || true
    
    # Create integration response for OPTIONS
    aws apigateway put-integration-response \
        --rest-api-id $API_ID \
        --resource-id $resource_id \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Headers": "'\''Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'\''","method.response.header.Access-Control-Allow-Methods": "'\''GET,POST,PUT,DELETE,OPTIONS'\''","method.response.header.Access-Control-Allow-Origin": "'\''*'\''"}' 2>/dev/null || true
}

# Create /topics resource and methods
log "Setting up Topics API endpoints..."

TOPICS_RESOURCE_ID=$(create_resource $ROOT_RESOURCE_ID "topics" "topics")
create_method $TOPICS_RESOURCE_ID "GET" $TOPICS_FUNCTION_ARN $TOPICS_FUNCTION_NAME
create_method $TOPICS_RESOURCE_ID "POST" $TOPICS_FUNCTION_ARN $TOPICS_FUNCTION_NAME
enable_cors $TOPICS_RESOURCE_ID

# Create /topics/{id} resource
TOPICS_ID_RESOURCE_ID=$(create_resource $TOPICS_RESOURCE_ID "{id}" "topics/{id}")
create_method $TOPICS_ID_RESOURCE_ID "GET" $TOPICS_FUNCTION_ARN $TOPICS_FUNCTION_NAME
create_method $TOPICS_ID_RESOURCE_ID "PUT" $TOPICS_FUNCTION_ARN $TOPICS_FUNCTION_NAME
create_method $TOPICS_ID_RESOURCE_ID "DELETE" $TOPICS_FUNCTION_ARN $TOPICS_FUNCTION_NAME
enable_cors $TOPICS_ID_RESOURCE_ID

# Create /auth resource and methods
log "Setting up Authentication API endpoints..."

AUTH_RESOURCE_ID=$(create_resource $ROOT_RESOURCE_ID "auth" "auth")
enable_cors $AUTH_RESOURCE_ID

# Create /auth/register
REGISTER_RESOURCE_ID=$(create_resource $AUTH_RESOURCE_ID "register" "auth/register")
create_method $REGISTER_RESOURCE_ID "POST" $AUTH_FUNCTION_ARN $AUTH_FUNCTION_NAME
enable_cors $REGISTER_RESOURCE_ID

# Create /auth/login
LOGIN_RESOURCE_ID=$(create_resource $AUTH_RESOURCE_ID "login" "auth/login")
create_method $LOGIN_RESOURCE_ID "POST" $AUTH_FUNCTION_ARN $AUTH_FUNCTION_NAME
enable_cors $LOGIN_RESOURCE_ID

# Create /auth/verify
VERIFY_RESOURCE_ID=$(create_resource $AUTH_RESOURCE_ID "verify" "auth/verify")
create_method $VERIFY_RESOURCE_ID "GET" $AUTH_FUNCTION_ARN $AUTH_FUNCTION_NAME
enable_cors $VERIFY_RESOURCE_ID

# Create /auth/user
USER_RESOURCE_ID=$(create_resource $AUTH_RESOURCE_ID "user" "auth/user")
enable_cors $USER_RESOURCE_ID

# Create /auth/user/{id}
USER_ID_RESOURCE_ID=$(create_resource $USER_RESOURCE_ID "{id}" "auth/user/{id}")
create_method $USER_ID_RESOURCE_ID "GET" $AUTH_FUNCTION_ARN $AUTH_FUNCTION_NAME
create_method $USER_ID_RESOURCE_ID "PUT" $AUTH_FUNCTION_ARN $AUTH_FUNCTION_NAME
enable_cors $USER_ID_RESOURCE_ID

# Step 5: Deploy API
log "Deploying API to production stage..."

DEPLOYMENT_ID=$(aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --stage-description "Production stage for Learning Assistant API" \
    --description "Deployment $(date)" \
    --query 'id' --output text)

log "API deployed with deployment ID: $DEPLOYMENT_ID"

# Get API Gateway URL
API_URL="https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/prod"

# Step 6: Update Frontend Configuration
log "Updating frontend configuration..."

# Update authService.ts with the new API URL
AUTH_SERVICE_FILE="../src/services/authService.ts"
if [ -f "$AUTH_SERVICE_FILE" ]; then
    # Create backup
    cp "$AUTH_SERVICE_FILE" "$AUTH_SERVICE_FILE.backup"
    
    # Update the API URL
    sed -i.tmp "s|const AUTH_API_BASE_URL = '.*';|const AUTH_API_BASE_URL = '$API_URL';|g" "$AUTH_SERVICE_FILE"
    rm "$AUTH_SERVICE_FILE.tmp" 2>/dev/null || true
    
    log "Updated $AUTH_SERVICE_FILE with new API URL"
else
    warn "Could not find $AUTH_SERVICE_FILE to update"
fi

# Update api.ts with the new API URL (if needed)
API_SERVICE_FILE="../src/services/api.ts"
if [ -f "$API_SERVICE_FILE" ]; then
    # Check if it needs updating (different from current URL)
    if ! grep -q "$API_URL" "$API_SERVICE_FILE"; then
        cp "$API_SERVICE_FILE" "$API_SERVICE_FILE.backup"
        sed -i.tmp "s|const API_BASE_URL = '.*';|const API_BASE_URL = '$API_URL';|g" "$API_SERVICE_FILE"
        rm "$API_SERVICE_FILE.tmp" 2>/dev/null || true
        log "Updated $API_SERVICE_FILE with new API URL"
    else
        log "API service already has correct URL"
    fi
fi

# Step 7: Create environment file
log "Creating environment configuration..."

cat > .env << EOF
# Learning Assistant Environment Configuration
# Generated on $(date)

# API Configuration
API_BASE_URL=$API_URL
AUTH_API_BASE_URL=$API_URL

# AWS Configuration
AWS_REGION=$AWS_REGION
API_GATEWAY_ID=$API_ID
IAM_ROLE_NAME=$ACTUAL_ROLE_NAME

# Lambda Functions
TOPICS_LAMBDA_FUNCTION=$TOPICS_FUNCTION_NAME
AUTH_LAMBDA_FUNCTION=$AUTH_FUNCTION_NAME

# Security
JWT_SECRET=$JWT_SECRET

# DynamoDB Tables
TOPICS_TABLE=learning_assist_topics
USERS_TABLE=learning_assist_users
EOF

# Step 8: Test Deployment
log "Testing API endpoints..."

# Test Topics API
echo "Testing Topics API..."
TOPICS_TEST=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/topics" || echo "000")
if [ "$TOPICS_TEST" = "200" ]; then
    log "✅ Topics API is working"
else
    warn "⚠️  Topics API returned status: $TOPICS_TEST"
fi

# Test Auth API (should return 400 for missing body, which means endpoint is working)
echo "Testing Auth API..."
AUTH_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/register" -H "Content-Type: application/json" -d '{}' || echo "000")
if [ "$AUTH_TEST" = "400" ]; then
    log "✅ Auth API is working"
else
    warn "⚠️  Auth API returned status: $AUTH_TEST"
fi

# Cleanup temporary files
rm -f lambda-trust-policy.json topics-lambda.zip auth-lambda.zip
rm -rf auth-package

# Step 9: Display Results
echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo -e "${BLUE}API Gateway URL:${NC} $API_URL"
echo ""
echo -e "${BLUE}Available Endpoints:${NC}"
echo "📚 Topics API:"
echo "  GET    $API_URL/topics"
echo "  GET    $API_URL/topics?subject_id=<id>"
echo "  GET    $API_URL/topics/{id}"
echo "  POST   $API_URL/topics"
echo "  PUT    $API_URL/topics/{id}"
echo "  DELETE $API_URL/topics/{id}"
echo ""
echo "🔐 Authentication API:"
echo "  POST   $API_URL/auth/register"
echo "  POST   $API_URL/auth/login"
echo "  GET    $API_URL/auth/verify"
echo "  GET    $API_URL/auth/user/{id}"
echo "  PUT    $API_URL/auth/user/{id}"
echo ""
echo -e "${BLUE}Lambda Functions:${NC}"
echo "  📚 Topics: $TOPICS_FUNCTION_NAME"
echo "  🔐 Auth: $AUTH_FUNCTION_NAME"
echo ""
echo -e "${BLUE}DynamoDB Tables:${NC}"
echo "  📚 Topics: learning_assist_topics"
echo "  👤 Users: learning_assist_users (created automatically)"
echo ""
echo -e "${BLUE}Security:${NC}"
echo "  🔑 JWT Secret: $JWT_SECRET"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Frontend has been updated with new API URLs"
echo "2. Restart your React app to use the new endpoints"
echo "3. Test authentication by registering a new user"
echo "4. Environment configuration saved to .env file"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "- Save the JWT secret securely: $JWT_SECRET"
echo "- API Gateway URL has been updated in frontend files"
echo "- Backup files created with .backup extension"
echo ""
echo "🚀 Your Learning Assistant API is now live!"
