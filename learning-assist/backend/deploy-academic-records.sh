#!/bin/bash

# Deploy Academic Records Lambda Function
# This script packages and deploys the academic records management Lambda function

set -e

echo "=========================================="
echo "Academic Records Lambda Deployment"
echo "=========================================="

# Configuration
FUNCTION_NAME="academic-records-service"
REGION="us-west-2"
RUNTIME="python3.9"
HANDLER="academic_records_lambda_function.lambda_handler"
ROLE_ARN="arn:aws:iam::143320675925:role/service-role/learning-assist-lambda-role-k2v61duu"
ZIP_FILE="academic-records-lambda.zip"

echo ""
echo "Step 1: Creating deployment package..."
cd "$(dirname "$0")"

# Remove old zip if exists
rm -f $ZIP_FILE

# Create zip with Lambda function
zip -r $ZIP_FILE academic_records_lambda_function.py

# Add boto3 dependencies (if not using Lambda's built-in)
# Uncomment if you need specific boto3 version
# zip -r $ZIP_FILE boto3/ botocore/

echo "✓ Deployment package created"

echo ""
echo "Step 2: Checking if Lambda function exists..."

if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
    echo "Function exists. Updating code..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://$ZIP_FILE \
        --region $REGION
    
    echo "✓ Function code updated"
    
    echo ""
    echo "Step 3: Updating function configuration..."
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --timeout 30 \
        --memory-size 512 \
        --region $REGION
    
    echo "✓ Function configuration updated"
else
    echo "Function does not exist. Creating new function..."
    
    # Use existing IAM role
    echo "Using existing IAM role: $ROLE_ARN"
    
    # Create Lambda function
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --role $ROLE_ARN \
        --handler $HANDLER \
        --zip-file fileb://$ZIP_FILE \
        --timeout 30 \
        --memory-size 512 \
        --region $REGION
    
    echo "✓ Lambda function created"
fi

echo ""
echo "Step 4: Getting function details..."
FUNCTION_ARN=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Configuration.FunctionArn' --output text)

echo "✓ Function ARN: $FUNCTION_ARN"

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Lambda Function: $FUNCTION_NAME"
echo "Region: $REGION"
echo ""
echo "Next steps:"
echo "1. Create an API Gateway REST API"
echo "2. Create resources and methods for the endpoints"
echo "3. Integrate with this Lambda function"
echo "4. Deploy the API to a stage"
echo ""
echo "API Endpoints to configure:"
echo "  POST   /academic-records                 - Create record"
echo "  GET    /academic-records?parent_phone=X  - Query by parent"
echo "  GET    /academic-records?teacher_id=X    - Query by teacher"
echo "  GET    /academic-records?school_id=X     - Query by school"
echo "  GET    /academic-records/{id}/{topic}    - Get specific record"
echo "  PUT    /academic-records/{id}/{topic}    - Update record"
echo "  DELETE /academic-records/{id}/{topic}    - Delete record"
echo ""
echo "The Lambda will auto-create the DynamoDB table on first invocation."
echo ""

