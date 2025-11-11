#!/bin/bash

# Quick setup script - Run this after setting AWS credentials in environment
# This will configure DeepSeek API key and test the setup

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

DEEPSEEK_API_KEY="sk-9dbf598ca42c4d958e6476a5535f1555"

echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          🚀 Quick DeepSeek API Setup                           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check AWS credentials
echo "🔍 Checking AWS credentials..."
aws sts get-caller-identity --region us-west-2 > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ AWS credentials not valid or expired!${NC}"
    echo ""
    echo "Please run:"
    echo "  aws sso login --profile Adhik"
    echo "  aws configure export-credentials --profile Adhik"
    echo ""
    echo "Then copy the credentials and run:"
    echo "  export AWS_ACCESS_KEY_ID=\"...\""
    echo "  export AWS_SECRET_ACCESS_KEY=\"...\""
    echo "  export AWS_SESSION_TOKEN=\"...\""
    echo ""
    echo "Then run this script again!"
    exit 1
fi

echo -e "${GREEN}✅ AWS credentials valid!${NC}"
echo ""

# Get account info
ACCOUNT_ID=$(aws sts get-caller-identity --region us-west-2 --query 'Account' --output text)
USER_ARN=$(aws sts get-caller-identity --region us-west-2 --query 'Arn' --output text)

echo "Account: $ACCOUNT_ID"
echo "User: $USER_ARN"
echo ""

# Configure DeepSeek API Key
echo "🔧 Configuring DeepSeek API Key..."
aws lambda update-function-configuration \
  --function-name learning-assist-gemini-proxy \
  --environment "Variables={DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY}" \
  --region us-west-2 \
  --query '{FunctionName:FunctionName, LastModified:LastModified}' \
  --output table

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ DeepSeek API key configured successfully!${NC}"
    echo ""
    
    # Wait for Lambda to update
    echo "⏳ Waiting for Lambda to update (5 seconds)..."
    sleep 5
    
    # Test the configuration
    echo ""
    echo "🧪 Testing DeepSeek API..."
    
    cat > /tmp/test-payload.json << 'PAYLOAD'
{
  "httpMethod": "POST",
  "pathParameters": {"proxy": "generate-content"},
  "headers": {"Content-Type": "application/json"},
  "body": "{\"model\": \"deepseek-chat\", \"contents\": [{\"parts\": [{\"text\": \"Say hello in exactly 3 words\"}]}], \"generationConfig\": {\"temperature\": 0.7, \"maxOutputTokens\": 50}}"
}
PAYLOAD

    aws lambda invoke \
      --function-name learning-assist-gemini-proxy \
      --region us-west-2 \
      --cli-binary-format raw-in-base64-out \
      --payload file:///tmp/test-payload.json \
      /tmp/lambda-response.json > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        STATUS_CODE=$(cat /tmp/lambda-response.json | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('statusCode', 'unknown'))" 2>/dev/null)
        
        if [ "$STATUS_CODE" == "200" ]; then
            echo -e "${GREEN}✅ DeepSeek API is working!${NC}"
            echo ""
            echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
            echo -e "${GREEN}║                    🎉 ALL CONFIGURED!                          ║${NC}"
            echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
            echo ""
            echo "Your app is ready to use!"
            echo ""
            echo "📋 Next Steps:"
            echo "  1. Open INCOGNITO browser window (Cmd+Shift+N)"
            echo "  2. Visit: http://aischool.seedlinglabs.com.s3-website-us-west-2.amazonaws.com"
            echo "  3. Upload PDF and test content generation"
            echo "  4. All tabs should work now! ✅"
            
        elif [ "$STATUS_CODE" == "402" ]; then
            echo -e "${YELLOW}⚠️  API key valid but no credits!${NC}"
            echo ""
            echo "Your DeepSeek account needs credits."
            echo "Add funds at: https://platform.deepseek.com/usage"
            
        elif [ "$STATUS_CODE" == "401" ]; then
            echo -e "${RED}❌ API key invalid!${NC}"
            echo "Please check the DeepSeek API key."
            
        else
            echo -e "${YELLOW}⚠️  Unexpected response: $STATUS_CODE${NC}"
            cat /tmp/lambda-response.json
        fi
    else
        echo -e "${YELLOW}⚠️  Could not test Lambda${NC}"
    fi
    
    rm -f /tmp/test-payload.json /tmp/lambda-response.json
    
else
    echo -e "${RED}❌ Failed to configure API key!${NC}"
    exit 1
fi

echo ""
echo "────────────────────────────────────────────────────────────────"

