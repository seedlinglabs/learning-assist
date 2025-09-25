#!/bin/bash

# Deploy Gemini Proxy Lambda Function
# This script securely deploys the Gemini API proxy with proper key management

set -e

echo "🔐 Deploying Gemini API Proxy..."
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if GEMINI_API_KEY is provided
if [ -z "$GEMINI_API_KEY" ]; then
    echo -e "${RED}❌ Error: GEMINI_API_KEY environment variable not set${NC}"
    echo "Please set your Gemini API key:"
    echo "export GEMINI_API_KEY='your-key-here'"
    exit 1
fi

echo -e "${GREEN}✅ Gemini API key found${NC}"

# Check AWS configuration
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI not configured. Please run 'aws configure'${NC}"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "us-west-2")

echo -e "${GREEN}✅ AWS configured (Account: $ACCOUNT_ID, Region: $REGION)${NC}"

# Function name
FUNCTION_NAME="learning-assist-gemini-proxy"

# Find existing IAM role (same pattern as deploy-auth-only.sh)
echo "🔍 Finding IAM role..."
ROLE_NAME=$(aws iam list-roles --query "Roles[?starts_with(RoleName, 'learning-assist-lambda-role')].RoleName" --output text | head -1)

if [ -z "$ROLE_NAME" ]; then
    echo -e "${RED}❌ No IAM role found with pattern 'learning-assist-lambda-role'${NC}"
    echo "Available roles:"
    aws iam list-roles --query "Roles[].RoleName" --output text | grep -E "(lambda|learning)" || echo "No matching roles found"
    echo ""
    echo "Please create a role first by running one of these scripts:"
    echo "  ./deploy-topics-only.sh  (creates role + topics lambda)"
    echo "  ./deploy-auth-only.sh    (creates role + auth lambda)"
    echo ""
    echo "Or create manually:"
    echo "  aws iam create-role --role-name learning-assist-lambda-role --assume-role-policy-document file://trust-policy.json"
    exit 1
fi

ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
echo -e "${GREEN}✅ Using existing IAM role: $ROLE_NAME${NC}"

# Verify the role has the necessary policies
echo "🔍 Checking role policies..."
POLICIES=$(aws iam list-attached-role-policies --role-name $ROLE_NAME --query 'AttachedPolicies[].PolicyArn' --output text)
if echo "$POLICIES" | grep -q "AWSLambdaBasicExecutionRole" && echo "$POLICIES" | grep -q "AmazonDynamoDBFullAccess"; then
    echo -e "${GREEN}✅ Role has required policies${NC}"
else
    echo -e "${YELLOW}⚠️  Role may be missing required policies. Adding them...${NC}"
    aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole 2>/dev/null || true
    aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess 2>/dev/null || true
    echo -e "${GREEN}✅ Policies attached${NC}"
fi

# Create deployment package
echo "📦 Creating deployment package..."
rm -f gemini-lambda.zip

# Create temporary directory for package
mkdir -p gemini-package
cp gemini_lambda_function.py gemini-package/lambda_function.py

# Install dependencies
cd gemini-package
echo "📦 Installing Python dependencies..."
if command -v pip3 >/dev/null 2>&1; then
    pip3 install requests -t . --quiet
elif command -v pip >/dev/null 2>&1; then
    pip install requests -t . --quiet
else
    echo -e "${RED}❌ Neither pip nor pip3 found. Please install Python pip.${NC}"
    echo "On macOS: brew install python"
    echo "On Ubuntu: apt-get install python3-pip"
    exit 1
fi
cd ..

# Create zip file
cd gemini-package
zip -r ../gemini-lambda.zip . > /dev/null
cd ..
rm -rf gemini-package

echo -e "${GREEN}✅ Deployment package created${NC}"

# Deploy or update Lambda function
if aws lambda get-function --function-name $FUNCTION_NAME > /dev/null 2>&1; then
    echo "🔄 Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://gemini-lambda.zip > /dev/null
    
    # Update environment variables
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --environment Variables="{GEMINI_API_KEY=$GEMINI_API_KEY}" > /dev/null
        
    echo -e "${GREEN}✅ Lambda function updated${NC}"
else
    echo "🆕 Creating new Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime python3.9 \
        --role $ROLE_ARN \
        --handler lambda_function.lambda_handler \
        --zip-file fileb://gemini-lambda.zip \
        --timeout 60 \
        --memory-size 256 \
        --environment Variables="{GEMINI_API_KEY=$GEMINI_API_KEY}" > /dev/null
        
    echo -e "${GREEN}✅ Lambda function created${NC}"
fi

# Create DynamoDB table for usage tracking
TABLE_NAME="learning_assist_gemini_usage"

if ! aws dynamodb describe-table --table-name $TABLE_NAME > /dev/null 2>&1; then
    echo "📊 Creating usage tracking table..."
    aws dynamodb create-table \
        --table-name $TABLE_NAME \
        --attribute-definitions \
            AttributeName=usage_id,AttributeType=S \
        --key-schema \
            AttributeName=usage_id,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST > /dev/null
    
    echo "⏳ Waiting for table to become active..."
    aws dynamodb wait table-exists --table-name $TABLE_NAME
    echo -e "${GREEN}✅ Usage tracking table created${NC}"
else
    echo -e "${GREEN}✅ Usage tracking table already exists${NC}"
fi

# Get API Gateway ID
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='learning-assist-api'].id" --output text)

if [ -z "$API_ID" ] || [ "$API_ID" = "None" ]; then
    echo -e "${RED}❌ API Gateway not found. Please run deploy-api-gateway.sh first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found API Gateway: $API_ID${NC}"

# Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/'].id" --output text)

# Create /gemini resource if it doesn't exist
GEMINI_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?pathPart=='gemini'].id" --output text 2>/dev/null || echo "")

if [ -z "$GEMINI_RESOURCE_ID" ] || [ "$GEMINI_RESOURCE_ID" = "None" ]; then
    echo "🔗 Creating /gemini resource..."
    GEMINI_RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $ROOT_RESOURCE_ID \
        --path-part gemini \
        --query 'id' --output text)
    echo -e "${GREEN}✅ Created /gemini resource${NC}"
else
    echo -e "${GREEN}✅ /gemini resource already exists${NC}"
fi

# Create /{proxy+} resource under /gemini
PROXY_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?pathPart=='{proxy+}' && parentId=='$GEMINI_RESOURCE_ID'].id" --output text 2>/dev/null || echo "")

if [ -z "$PROXY_RESOURCE_ID" ] || [ "$PROXY_RESOURCE_ID" = "None" ]; then
    echo "🔗 Creating /{proxy+} resource..."
    PROXY_RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $GEMINI_RESOURCE_ID \
        --path-part '{proxy+}' \
        --query 'id' --output text)
    echo -e "${GREEN}✅ Created /{proxy+} resource${NC}"
else
    echo -e "${GREEN}✅ /{proxy+} resource already exists${NC}"
fi

# Add methods to proxy resource
for METHOD in GET POST PUT DELETE OPTIONS; do
    if ! aws apigateway get-method --rest-api-id $API_ID --resource-id $PROXY_RESOURCE_ID --http-method $METHOD > /dev/null 2>&1; then
        echo "➕ Adding $METHOD method..."
        
        # Create method
        aws apigateway put-method \
            --rest-api-id $API_ID \
            --resource-id $PROXY_RESOURCE_ID \
            --http-method $METHOD \
            --authorization-type NONE > /dev/null
        
        # Create integration
        aws apigateway put-integration \
            --rest-api-id $API_ID \
            --resource-id $PROXY_RESOURCE_ID \
            --http-method $METHOD \
            --type AWS_PROXY \
            --integration-http-method POST \
            --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME/invocations > /dev/null
    fi
done

# Grant API Gateway permission to invoke Lambda
STATEMENT_ID="gemini-proxy-permission"
if ! aws lambda get-policy --function-name $FUNCTION_NAME 2>/dev/null | grep -q $STATEMENT_ID; then
    echo "🔐 Adding API Gateway permissions..."
    aws lambda add-permission \
        --function-name $FUNCTION_NAME \
        --statement-id $STATEMENT_ID \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*" > /dev/null
    echo -e "${GREEN}✅ Permissions added${NC}"
fi

# Deploy API
echo "🚀 Deploying API..."
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name pre-prod > /dev/null

echo -e "${GREEN}✅ API deployed${NC}"

# Clean up
rm -f gemini-lambda.zip

# Output results
echo ""
echo "🎉 Gemini Proxy Deployment Complete!"
echo "===================================="
echo -e "${GREEN}✅ Lambda Function: $FUNCTION_NAME${NC}"
echo -e "${GREEN}✅ API Endpoint: https://$API_ID.execute-api.$REGION.amazonaws.com/pre-prod/gemini/{NC}"
echo -e "${GREEN}✅ Usage Tracking: Enabled${NC}"
echo -e "${GREEN}✅ Rate Limiting: 100 requests/day per user${NC}"

echo ""
echo "📋 Available Endpoints:"
echo "  POST /gemini/generate-content"
echo "  POST /gemini/discover-documents" 
echo "  POST /gemini/enhance-section"
echo "  POST /gemini/analyze-chapter"

echo ""
echo -e "${YELLOW}⚠️  Security Notes:${NC}"
echo "  • API key is securely stored in Lambda environment"
echo "  • All requests are logged and rate-limited"
echo "  • Usage is tracked per user for monitoring"
echo "  • Frontend should be updated to use these endpoints"

echo ""
echo -e "${GREEN}🔗 Next Steps:${NC}"
echo "  1. Update frontend to use the proxy endpoints"
echo "  2. Remove REACT_APP_GEMINI_API_KEY from frontend"
echo "  3. Test the new secure endpoints"
