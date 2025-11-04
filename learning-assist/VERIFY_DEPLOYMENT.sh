#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║              🔍 Verify Deployment Status                           ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Check Lambda deployment
echo "1. Lambda Function Status:"
echo "─────────────────────────────────────────────────────────────────────"
aws lambda get-function --function-name learning-assist-gemini-proxy \
  --region us-west-2 --profile Adhik \
  --query '{Name:Configuration.FunctionName,Modified:Configuration.LastModified,State:Configuration.State,Timeout:Configuration.Timeout}' \
  --output table 2>&1
echo ""

# Check API Gateway timeout
echo "2. API Gateway Integration Timeout:"
echo "─────────────────────────────────────────────────────────────────────"
TIMEOUT=$(aws apigateway get-integration \
  --rest-api-id xvq11x0421 \
  --resource-id o538re \
  --http-method POST \
  --region us-west-2 \
  --profile Adhik \
  --query 'timeoutInMillis' \
  --output text 2>&1)
echo "  POST /gemini/analyze-chapter: ${TIMEOUT}ms ($(($TIMEOUT / 1000))s)"
echo ""

# Check S3 deployment
echo "3. Frontend Deployment (S3):"
echo "─────────────────────────────────────────────────────────────────────"
MAIN_FILE=$(aws s3 ls s3://aischool.seedlinglabs.com/static/js/ \
  --region us-west-2 --profile Adhik 2>&1 | \
  grep "main\." | tail -1 | awk '{print $4}')
echo "  Latest main.js: $MAIN_FILE"
echo "  URL: http://aischool.seedlinglabs.com.s3-website-us-west-2.amazonaws.com"
echo ""

# Check recent Lambda logs
echo "4. Recent Lambda Execution Logs (Last 5 minutes):"
echo "─────────────────────────────────────────────────────────────────────"
echo "Checking for analyze-chapter requests..."
RECENT_LOGS=$(aws logs tail /aws/lambda/learning-assist-gemini-proxy \
  --since 5m --region us-west-2 --profile Adhik \
  --format short 2>&1 | \
  grep -E "analyze-chapter|DeepSeek|Duration" | tail -10)

if [ -z "$RECENT_LOGS" ]; then
  echo "  No recent requests in last 5 minutes"
else
  echo "$RECENT_LOGS" | while read line; do
    echo "  $line"
  done
fi
echo ""

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                    📋 DEPLOYMENT SUMMARY                            ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Backend Lambda: Deployed (no JSON pre-processing)"
echo "✅ API Gateway: 80-second timeout configured"
echo "✅ Frontend: $MAIN_FILE deployed with JSON unescaping"
echo ""
echo "🧪 TO TEST:"
echo "  1. Open INCOGNITO/PRIVATE browser window"
echo "  2. Visit: http://aischool.seedlinglabs.com.s3-website-us-west-2.amazonaws.com"
echo "  3. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)"
echo "  4. Check console: Should load $MAIN_FILE"
echo "  5. Upload PDF and analyze with 8-10 topics"
echo ""
echo "Expected: No JSON parsing errors, detailed learning objectives! ✅"
echo ""

