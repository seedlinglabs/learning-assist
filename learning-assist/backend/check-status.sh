#!/bin/bash

# Learning Assistant - Status Check
# Shows the current status of all deployed components

echo "📊 Learning Assistant - Deployment Status"
echo "========================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

status_ok() { echo -e "${GREEN}✅ $1${NC}"; }
status_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
status_error() { echo -e "${RED}❌ $1${NC}"; }
status_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Check AWS access
echo "1. AWS Configuration:"
if aws sts get-caller-identity &>/dev/null; then
    ACCOUNT=$(aws sts get-caller-identity --query 'Account' --output text)
    REGION=$(aws configure get region)
    status_ok "AWS CLI configured (Account: $ACCOUNT, Region: $REGION)"
else
    status_error "AWS CLI not configured"
fi

echo ""

# Check IAM Role
echo "2. IAM Role:"
ROLE_NAME=$(aws iam list-roles --query "Roles[?starts_with(RoleName, 'learning-assist-lambda-role')].RoleName" --output text | head -1 2>/dev/null)
if [ -n "$ROLE_NAME" ]; then
    status_ok "IAM Role exists: $ROLE_NAME"
else
    status_error "No IAM role found with pattern 'learning-assist-lambda-role'"
fi

echo ""

# Check Lambda Functions
echo "3. Lambda Functions:"

# Topics Lambda
if aws lambda get-function --function-name learning-assist-topics &>/dev/null; then
    TOPICS_STATE=$(aws lambda get-function --function-name learning-assist-topics --query 'Configuration.State' --output text)
    TOPICS_SIZE=$(aws lambda get-function --function-name learning-assist-topics --query 'Configuration.CodeSize' --output text)
    status_ok "Topics Lambda: learning-assist-topics (State: $TOPICS_STATE, Size: $TOPICS_SIZE bytes)"
else
    status_error "Topics Lambda not found: learning-assist-topics"
fi

# Auth Lambda
if aws lambda get-function --function-name learning-assist-auth &>/dev/null; then
    AUTH_STATE=$(aws lambda get-function --function-name learning-assist-auth --query 'Configuration.State' --output text)
    AUTH_SIZE=$(aws lambda get-function --function-name learning-assist-auth --query 'Configuration.CodeSize' --output text)
    AUTH_ENV=$(aws lambda get-function --function-name learning-assist-auth --query 'Configuration.Environment.Variables.JWT_SECRET' --output text 2>/dev/null)
    
    status_ok "Auth Lambda: learning-assist-auth (State: $AUTH_STATE, Size: $AUTH_SIZE bytes)"
    
    if [ "$AUTH_ENV" != "None" ] && [ -n "$AUTH_ENV" ]; then
        status_ok "JWT Secret configured"
    else
        status_warn "JWT Secret not configured"
    fi
else
    status_error "Auth Lambda not found: learning-assist-auth"
fi

echo ""

# Check API Gateway
echo "4. API Gateway:"
API_ID="xvq11x0421"
if aws apigateway get-rest-api --rest-api-id $API_ID &>/dev/null; then
    API_NAME=$(aws apigateway get-rest-api --rest-api-id $API_ID --query 'name' --output text)
    status_ok "API Gateway exists: $API_NAME ($API_ID)"
    
    # Check resources
    echo "   Resources:"
    aws apigateway get-resources --rest-api-id $API_ID --query 'items[].{Path:path,Methods:resourceMethods}' --output text | while read path methods; do
        if [ "$methods" = "None" ]; then
            status_info "   $path (no methods)"
        else
            status_ok "   $path (has methods)"
        fi
    done
    
else
    status_error "API Gateway not found: $API_ID"
fi

echo ""

# Check DynamoDB Tables
echo "5. DynamoDB Tables:"

# Topics table
if aws dynamodb describe-table --table-name learning_assist_topics &>/dev/null; then
    TOPICS_STATUS=$(aws dynamodb describe-table --table-name learning_assist_topics --query 'Table.TableStatus' --output text)
    TOPICS_ITEMS=$(aws dynamodb scan --table-name learning_assist_topics --select COUNT --query 'Count' --output text 2>/dev/null || echo "?")
    status_ok "Topics table: learning_assist_topics (Status: $TOPICS_STATUS, Items: $TOPICS_ITEMS)"
else
    status_warn "Topics table not found: learning_assist_topics (will be created automatically)"
fi

# Users table
if aws dynamodb describe-table --table-name learning_assist_users &>/dev/null; then
    USERS_STATUS=$(aws dynamodb describe-table --table-name learning_assist_users --query 'Table.TableStatus' --output text)
    USERS_ITEMS=$(aws dynamodb scan --table-name learning_assist_users --select COUNT --query 'Count' --output text 2>/dev/null || echo "?")
    status_ok "Users table: learning_assist_users (Status: $USERS_STATUS, Items: $USERS_ITEMS)"
else
    status_warn "Users table not found: learning_assist_users (will be created when auth is used)"
fi

echo ""

# Test API Endpoints
echo "6. API Endpoint Tests:"

API_BASE="https://$API_ID.execute-api.us-west-2.amazonaws.com/pre-prod"

# Test topics endpoint
TOPICS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/topics" 2>/dev/null || echo "000")
if [ "$TOPICS_STATUS" = "200" ]; then
    status_ok "Topics API working: GET /topics"
else
    status_error "Topics API failed: GET /topics (Status: $TOPICS_STATUS)"
fi

# Test auth endpoints
AUTH_REGISTER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE/auth/register" -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
if [ "$AUTH_REGISTER_STATUS" = "400" ]; then
    status_ok "Auth Register API working: POST /auth/register (returns 400 for empty body)"
elif [ "$AUTH_REGISTER_STATUS" = "502" ]; then
    status_warn "Auth Register API needs dependencies: POST /auth/register (502 error)"
elif [ "$AUTH_REGISTER_STATUS" = "403" ]; then
    status_warn "Auth Register endpoint not configured: POST /auth/register (403 error)"
else
    status_error "Auth Register API failed: POST /auth/register (Status: $AUTH_REGISTER_STATUS)"
fi

echo ""

# Summary and recommendations
echo "7. Summary & Next Steps:"
echo "========================"

if [ "$TOPICS_STATUS" = "200" ]; then
    status_ok "Topics API is fully functional"
else
    echo "📝 To fix topics API:"
    echo "   ./deploy-topics-only.sh"
fi

if [ "$AUTH_REGISTER_STATUS" = "400" ]; then
    status_ok "Auth API is fully functional"
elif [ "$AUTH_REGISTER_STATUS" = "502" ]; then
    echo "📝 To fix auth API dependencies:"
    echo "   ./add-auth-dependencies.sh"
elif [ "$AUTH_REGISTER_STATUS" = "403" ]; then
    echo "📝 To setup auth API endpoints:"
    echo "   ./deploy-api-gateway.sh"
else
    echo "📝 To setup auth completely:"
    echo "   ./deploy-auth-only.sh"
    echo "   ./add-auth-dependencies.sh"
    echo "   ./deploy-api-gateway.sh"
fi

echo ""
echo "🔗 Quick Links:"
echo "Lambda Console: https://console.aws.amazon.com/lambda/home?region=us-west-2"
echo "API Gateway Console: https://console.aws.amazon.com/apigateway/home?region=us-west-2#/apis/$API_ID"
echo "DynamoDB Console: https://console.aws.amazon.com/dynamodb/home?region=us-west-2"
echo ""
echo "🚀 Status check complete!"
