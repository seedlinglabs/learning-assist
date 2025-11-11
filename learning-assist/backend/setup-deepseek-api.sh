#!/bin/bash

# ============================================================================
# DeepSeek API Configuration Script
# ============================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          DeepSeek API Configuration for Lambda                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"

# Check if API key is provided
if [ -z "$DEEPSEEK_API_KEY" ]; then
    echo -e "${RED}❌ Error: DEEPSEEK_API_KEY environment variable not set${NC}"
    echo ""
    echo "Please run this script with your DeepSeek API key:"
    echo -e "${YELLOW}export DEEPSEEK_API_KEY='sk-your-deepseek-api-key-here'${NC}"
    echo -e "${YELLOW}./setup-deepseek-api.sh${NC}"
    echo ""
    echo "Get your API key from: https://platform.deepseek.com/api_keys"
    exit 1
fi

# Validate API key format (DeepSeek keys usually start with 'sk-')
if [[ ! "$DEEPSEEK_API_KEY" =~ ^sk- ]]; then
    echo -e "${YELLOW}⚠️  Warning: DeepSeek API keys usually start with 'sk-'${NC}"
    echo "Your key: ${DEEPSEEK_API_KEY:0:10}..."
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Mask key for display
MASKED_KEY="${DEEPSEEK_API_KEY:0:10}...${DEEPSEEK_API_KEY: -4}"
echo -e "${GREEN}✅ DeepSeek API Key: $MASKED_KEY${NC}"

echo ""
echo "🔧 Updating Lambda function..."

# Update Lambda function configuration
aws lambda update-function-configuration \
    --function-name learning-assist-gemini-proxy \
    --environment "Variables={DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY}" \
    --profile Adhik \
    --region us-west-2 \
    --output table > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Lambda function updated successfully!${NC}"
else
    echo -e "${RED}❌ Failed to update Lambda function${NC}"
    exit 1
fi

# Wait for update to propagate
echo ""
echo "⏳ Waiting for configuration to update (5 seconds)..."
sleep 5

# Verify the API key is set
echo ""
echo "=== Verifying Configuration ==="
KEY_CHECK=$(aws lambda get-function-configuration \
    --function-name learning-assist-gemini-proxy \
    --profile Adhik \
    --region us-west-2 \
    --query 'Environment.Variables.DEEPSEEK_API_KEY' \
    --output text 2>&1)

if [[ "$KEY_CHECK" == sk-* ]]; then
    VERIFIED_MASKED="${KEY_CHECK:0:10}...${KEY_CHECK: -4}"
    echo -e "${GREEN}✅ DEEPSEEK_API_KEY verified: $VERIFIED_MASKED${NC}"
else
    echo -e "${RED}❌ Failed to verify API key${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ✅ Configuration Complete!                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "📋 Next Steps:"
echo "  1. Open your app in INCOGNITO mode"
echo "  2. Test content generation on all tabs"
echo "  3. Monitor for any errors"
echo ""
echo "🔍 Monitor CloudWatch logs:"
echo "  aws logs tail /aws/lambda/learning-assist-gemini-proxy --follow \\"
echo "    --profile Adhik --region us-west-2"
echo ""
echo -e "${GREEN}🎉 Ready to generate content with DeepSeek!${NC}"

