#!/bin/bash
set -e

echo "📦 Deploying Topics Lambda with PyPDF2..."

# Clean up
rm -rf topics-lambda-package topics-lambda.zip

# Create package directory
mkdir -p topics-lambda-package

# Install dependencies
echo "Installing PyPDF2..."
pip install PyPDF2==3.0.1 -t topics-lambda-package/ --quiet

# Copy Lambda function
cp lambda_function.py topics-lambda-package/

# Create zip
echo "Creating deployment package..."
cd topics-lambda-package
zip -r ../topics-lambda.zip . -q
cd ..

# Deploy
echo "Deploying to AWS..."
/opt/homebrew/bin/aws lambda update-function-code \
  --function-name learning-assist-topics \
  --zip-file fileb://topics-lambda.zip \
  --region us-west-2 \
  --profile AdministratorAccess-143320675925 \
  --query '[FunctionName,LastModified,CodeSize]' \
  --output table

echo ""
echo "✅ Topics Lambda deployed with PyPDF2!"
echo "📋 New endpoint available: POST /extract-pdf"
