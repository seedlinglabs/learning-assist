#!/bin/bash

# Learning Assistant - API Testing Script
# Tests all deployed endpoints to verify functionality

set -e

# Load configuration from .env file
if [ -f ".env" ]; then
    source .env
    echo "🧪 Testing Learning Assistant API"
    echo "=================================="
    echo "API URL: $API_BASE_URL"
    echo ""
else
    echo "❌ .env file not found. Please run ./deploy.sh first."
    exit 1
fi

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local data=$4
    local description=$5
    
    echo -n "Testing $description... "
    
    if [ -n "$data" ]; then
        status=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$API_BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null || echo "000")
    else
        status=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$API_BASE_URL$endpoint" 2>/dev/null || echo "000")
    fi
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $status)"
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $status)"
    fi
}

echo "📚 Testing Topics API:"
test_endpoint "GET" "/topics" "200" "" "Get all topics"
test_endpoint "GET" "/topics?subject_id=test" "200" "" "Get topics by subject"
test_endpoint "POST" "/topics" "400" '{}' "Create topic (should fail with missing data)"

echo ""
echo "🔐 Testing Authentication API:"
test_endpoint "POST" "/auth/register" "400" '{}' "Register user (should fail with missing data)"
test_endpoint "POST" "/auth/login" "400" '{}' "Login user (should fail with missing data)"
test_endpoint "GET" "/auth/verify" "401" "" "Verify token (should fail without token)"

echo ""
echo "🧪 Testing Complete Registration & Login Flow:"

# Test user registration
echo -n "Registering test user... "
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test-'$(date +%s)'@example.com",
        "password": "testpass123",
        "name": "Test User",
        "user_type": "teacher"
    }' 2>/dev/null)

if echo "$REGISTER_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✅ PASS${NC}"
    
    # Extract token for further testing
    if command -v jq &> /dev/null; then
        TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')
        USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.user_id')
    else
        TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token": *"[^"]*"' | sed 's/"token": *"//' | sed 's/"//')
        USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"user_id": *"[^"]*"' | sed 's/"user_id": *"//' | sed 's/"//')
    fi
    
    # Test token verification
    echo -n "Verifying JWT token... "
    VERIFY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE_URL/auth/verify" \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
    
    if [ "$VERIFY_STATUS" = "200" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL${NC} (Status: $VERIFY_STATUS)"
    fi
    
    # Test get user profile
    echo -n "Getting user profile... "
    PROFILE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE_URL/auth/user/$USER_ID" 2>/dev/null || echo "000")
    
    if [ "$PROFILE_STATUS" = "200" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL${NC} (Status: $PROFILE_STATUS)"
    fi
    
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "Registration failed. Response: $REGISTER_RESPONSE"
fi

echo ""
echo "📊 Test Summary:"
echo "================"
echo "If all tests show ✅ PASS, your API is working correctly!"
echo "If any tests show ❌ FAIL, check CloudWatch Logs for details."
echo ""
echo "🔍 Debugging Resources:"
echo "- CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#logsV2:log-groups"
echo "- API Gateway Console: https://console.aws.amazon.com/apigateway/home?region=$AWS_REGION#/apis/$API_GATEWAY_ID"
echo "- Lambda Console: https://console.aws.amazon.com/lambda/home?region=$AWS_REGION"
echo "- DynamoDB Console: https://console.aws.amazon.com/dynamodb/home?region=$AWS_REGION"
