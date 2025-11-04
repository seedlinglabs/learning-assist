#!/bin/bash

echo "════════════════════════════════════════════════════════════════════"
echo "  Update API Gateway Integration Timeout to 80 Seconds"
echo "════════════════════════════════════════════════════════════════════"
echo ""

API_ID="xvq11x0421"
REGION="us-west-2"
PROFILE="Adhik"

echo "Step 1: Finding gemini proxy resource..."
RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id "$API_ID" \
  --region "$REGION" \
  --profile "$PROFILE" \
  --query "items[?path=='/gemini/{proxy+}'].id" \
  --output text)

if [ -z "$RESOURCE_ID" ]; then
  echo "ERROR: Could not find /gemini/{proxy+} resource"
  exit 1
fi

echo "✓ Found resource ID: $RESOURCE_ID"
echo ""

echo "Step 2: Updating integration timeout to 80000ms (80 seconds)..."
echo "Updating timeout for all HTTP methods..."

# Update timeout for each method
METHODS=("GET" "POST" "PUT" "DELETE")
SUCCESS_COUNT=0
TOTAL_METHODS=${#METHODS[@]}

for METHOD in "${METHODS[@]}"; do
  echo "  • Updating $METHOD method..."
  aws apigateway update-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$RESOURCE_ID" \
    --http-method "$METHOD" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --patch-operations "op=replace,path=/timeoutInMillis,value=80000" \
    2>&1 > /dev/null
  
  if [ $? -eq 0 ]; then
    echo "    ✓ $METHOD updated"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo "    ⚠ $METHOD failed (may not have integration)"
  fi
done

if [ $SUCCESS_COUNT -eq 0 ]; then
  echo "ERROR: Failed to update any integrations"
  exit 1
fi

echo "✓ Updated $SUCCESS_COUNT of $TOTAL_METHODS methods successfully"

echo ""
echo "Step 3: Deploying changes to pre-prod stage..."
aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name "pre-prod" \
  --description "Increase integration timeout to 80 seconds for long-running AI requests" \
  --region "$REGION" \
  --profile "$PROFILE"

if [ $? -eq 0 ]; then
  echo "✓ Deployment successful"
else
  echo "ERROR: Deployment failed"
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "  ✅ API Gateway timeout increased to 80 seconds!"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "The analyze-chapter endpoint can now handle requests up to 80 seconds."
echo ""

