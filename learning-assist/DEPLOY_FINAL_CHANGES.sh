#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║         🚀 Deploy PDF Size Validation & API Gateway Timeout        ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if AWS credentials are configured
echo "Checking AWS credentials..."
aws sts get-caller-identity --region us-west-2 --profile Adhik > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ AWS credentials not configured or expired"
  echo ""
  echo "Please run: aws sso login --profile Adhik"
  echo "Or set temporary credentials:"
  echo "  export AWS_ACCESS_KEY_ID=..."
  echo "  export AWS_SECRET_ACCESS_KEY=..."
  echo "  export AWS_SESSION_TOKEN=..."
  exit 1
fi

echo "✅ AWS credentials valid"
echo ""

# Step 1: Update API Gateway Timeout
echo "─────────────────────────────────────────────────────────────────────"
echo "Step 1: Updating API Gateway Timeout to 80 seconds..."
echo "─────────────────────────────────────────────────────────────────────"
cd backend
./update-api-gateway-timeout.sh
if [ $? -ne 0 ]; then
  echo "❌ Failed to update API Gateway timeout"
  exit 1
fi
cd ..
echo ""

# Step 2: Deploy Frontend
echo "─────────────────────────────────────────────────────────────────────"
echo "Step 2: Deploying Frontend with PDF Size Validation..."
echo "─────────────────────────────────────────────────────────────────────"
./deploy-frontend.sh
if [ $? -ne 0 ]; then
  echo "❌ Failed to deploy frontend"
  exit 1
fi
echo ""

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ DEPLOYMENT COMPLETE!                          ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Changes deployed:"
echo "  ✅ API Gateway timeout: 80 seconds"
echo "  ✅ PDF size validation: Max 10MB, recommended 5MB"
echo "  ✅ Content validation: Max 50k chars, recommended 20k chars"
echo ""
echo "Test the app:"
echo "  1. Upload a small PDF (1-3 pages)"
echo "  2. Click 'Analyze and Split Content'"
echo "  3. Should complete in 15-30 seconds!"
echo ""
echo "For teachers:"
echo "  • Best results: Upload PDFs under 5MB (1-3 pages)"
echo "  • Medium files: 5-10MB work but take 40-60 seconds"
echo "  • Large files: >10MB will be blocked"
echo ""

