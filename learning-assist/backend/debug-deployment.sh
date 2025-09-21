#!/bin/bash

# Learning Assistant - Deployment Debug Script
# Helps diagnose deployment issues

echo "🔍 Learning Assistant Deployment Diagnostics"
echo "============================================"

# Check AWS CLI
echo "1. AWS CLI Status:"
if command -v aws &> /dev/null; then
    echo "   ✅ AWS CLI installed: $(aws --version)"
    
    if aws sts get-caller-identity &> /dev/null; then
        echo "   ✅ AWS CLI configured"
        echo "   Account: $(aws sts get-caller-identity --query 'Account' --output text)"
        echo "   Region: $(aws configure get region)"
    else
        echo "   ❌ AWS CLI not configured"
    fi
else
    echo "   ❌ AWS CLI not installed"
fi

echo ""

# Check Python and pip
echo "2. Python Environment:"
if command -v python3 &> /dev/null; then
    echo "   ✅ Python3: $(python3 --version)"
else
    echo "   ❌ Python3 not found"
fi

if command -v pip3 &> /dev/null; then
    echo "   ✅ pip3: $(pip3 --version)"
else
    echo "   ❌ pip3 not found"
fi

echo ""

# Check existing AWS resources
echo "3. Existing AWS Resources:"

# Check IAM roles
ROLES=$(aws iam list-roles --query "Roles[?starts_with(RoleName, 'learning-assist-lambda-role')].RoleName" --output text 2>/dev/null || echo "")
if [ -n "$ROLES" ]; then
    echo "   ✅ IAM Roles found: $ROLES"
else
    echo "   ℹ️  No IAM roles found with pattern 'learning-assist-lambda-role'"
fi

# Check Lambda functions
FUNCTIONS=$(aws lambda list-functions --query "Functions[?starts_with(FunctionName, 'learning-assist')].FunctionName" --output text 2>/dev/null || echo "")
if [ -n "$FUNCTIONS" ]; then
    echo "   ✅ Lambda functions found: $FUNCTIONS"
else
    echo "   ℹ️  No Lambda functions found with pattern 'learning-assist'"
fi

# Check API Gateways
APIS=$(aws apigateway get-rest-apis --query "items[?starts_with(name, 'learning-assist')].{Name:name,Id:id}" --output text 2>/dev/null || echo "")
if [ -n "$APIS" ]; then
    echo "   ✅ API Gateways found: $APIS"
else
    echo "   ℹ️  No API Gateways found with pattern 'learning-assist'"
fi

# Check DynamoDB tables
TABLES=$(aws dynamodb list-tables --query "TableNames[?starts_with(@, 'learning_assist')]" --output text 2>/dev/null || echo "")
if [ -n "$TABLES" ]; then
    echo "   ✅ DynamoDB tables found: $TABLES"
else
    echo "   ℹ️  No DynamoDB tables found with pattern 'learning_assist'"
fi

echo ""

# Check local files
echo "4. Local Files:"
if [ -f "auth_lambda_function.py" ]; then
    echo "   ✅ auth_lambda_function.py ($(wc -l < auth_lambda_function.py) lines)"
else
    echo "   ❌ auth_lambda_function.py not found"
fi

if [ -f "lambda_function.py" ]; then
    echo "   ✅ lambda_function.py ($(wc -l < lambda_function.py) lines)"
else
    echo "   ❌ lambda_function.py not found"
fi

if [ -f "requirements.txt" ]; then
    echo "   ✅ requirements.txt:"
    cat requirements.txt | sed 's/^/      /'
else
    echo "   ❌ requirements.txt not found"
fi

if [ -f "deploy.sh" ]; then
    echo "   ✅ deploy.sh ($(wc -l < deploy.sh) lines)"
else
    echo "   ❌ deploy.sh not found"
fi

echo ""

# Check Python dependencies
echo "5. Python Dependencies:"
echo "   Checking if required packages can be imported..."

python3 -c "import boto3; print('   ✅ boto3 available')" 2>/dev/null || echo "   ❌ boto3 not available"
python3 -c "import jwt; print('   ✅ PyJWT available')" 2>/dev/null || echo "   ❌ PyJWT not available"
python3 -c "import cryptography; print('   ✅ cryptography available')" 2>/dev/null || echo "   ❌ cryptography not available"

echo ""

# Recommendations
echo "6. Recommendations:"
if [ -z "$FUNCTIONS" ]; then
    echo "   📝 No Lambda functions found - deployment needed"
fi

if ! python3 -c "import jwt" 2>/dev/null; then
    echo "   📝 Install PyJWT: pip3 install PyJWT"
fi

if ! python3 -c "import cryptography" 2>/dev/null; then
    echo "   📝 Install cryptography: pip3 install cryptography"
fi

echo ""
echo "🚀 To deploy: ./deploy.sh"
echo "🧪 To test: ./test-api.sh (after deployment)"
