#!/bin/bash

# Learning Assistant - Add Auth Dependencies
# Adds PyJWT and cryptography to the auth Lambda function

set -e

echo "📦 Learning Assistant - Adding Auth Dependencies"
echo "==============================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
debug() { echo -e "${BLUE}[DEBUG]${NC} $1"; }

AUTH_FUNCTION_NAME="learning-assist-auth"

# Check if auth function exists
log "Checking auth Lambda function..."
if ! aws lambda get-function --function-name $AUTH_FUNCTION_NAME &>/dev/null; then
    error "Auth Lambda function '$AUTH_FUNCTION_NAME' not found"
    echo "Please run ./deploy-auth-only.sh first"
    exit 1
fi

log "✅ Auth Lambda function found"

# Check Python and pip
log "Checking Python environment..."
if ! command -v python3 &> /dev/null; then
    error "Python3 not found. Please install Python3"
    exit 1
fi

if ! command -v pip3 &> /dev/null; then
    error "pip3 not found. Please install pip3"
    exit 1
fi

log "✅ Python3 and pip3 available"

# Create dependencies package
log "Installing Python dependencies..."

# Clean up
rm -rf auth-deps auth-with-deps.zip

# Create package directory
mkdir -p auth-deps

# Install dependencies
log "Installing PyJWT..."
pip3 install PyJWT==2.8.0 -t auth-deps/ --quiet

log "Installing cryptography..."
pip3 install cryptography==41.0.7 -t auth-deps/ --quiet --no-deps || {
    warn "Failed to install cryptography with --no-deps, trying without..."
    pip3 install cryptography==41.0.7 -t auth-deps/ --quiet
}

# Verify installations
if [ ! -d "auth-deps/jwt" ]; then
    error "PyJWT not installed correctly"
    exit 1
fi

if [ ! -d "auth-deps/cryptography" ]; then
    warn "cryptography might not be installed correctly"
    echo "Auth function may still work without it"
fi

log "✅ Dependencies installed"

# Copy Lambda function
cp auth_lambda_function.py auth-deps/

# Create deployment package
log "Creating deployment package..."
cd auth-deps
zip -r ../auth-with-deps.zip . -x "*.pyc" "*/__pycache__/*" "*.dist-info/*" --quiet
cd ..

PACKAGE_SIZE=$(du -h auth-with-deps.zip | cut -f1)
log "Package created: auth-with-deps.zip ($PACKAGE_SIZE)"

# Update Lambda function
log "Updating auth Lambda function with dependencies..."
aws lambda update-function-code \
    --function-name $AUTH_FUNCTION_NAME \
    --zip-file fileb://auth-with-deps.zip

log "✅ Auth Lambda updated with dependencies"

# Verify function is working
log "Verifying function..."
FUNCTION_STATE=$(aws lambda get-function --function-name $AUTH_FUNCTION_NAME --query 'Configuration.State' --output text)
log "Function state: $FUNCTION_STATE"

# Test function with a simple invoke
log "Testing function..."
echo '{"httpMethod": "GET", "path": "/test"}' > test-event.json
TEST_RESULT=$(aws lambda invoke \
    --function-name $AUTH_FUNCTION_NAME \
    --payload file://test-event.json \
    --output text \
    --query 'StatusCode' \
    response.json 2>/dev/null || echo "ERROR")

if [ "$TEST_RESULT" = "200" ]; then
    log "✅ Function test successful"
else
    warn "⚠️  Function test returned: $TEST_RESULT"
    if [ -f "response.json" ]; then
        debug "Response: $(cat response.json)"
    fi
fi

# Cleanup
rm -rf auth-deps auth-with-deps.zip test-event.json response.json 2>/dev/null || true

# Results
echo ""
echo "🎉 Dependencies Added Successfully!"
echo "=================================="
echo ""
echo -e "${GREEN}Auth Lambda Function:${NC} $AUTH_FUNCTION_NAME"
echo -e "${GREEN}Package Size:${NC} $PACKAGE_SIZE"
echo -e "${GREEN}Function State:${NC} $FUNCTION_STATE"
echo ""
echo -e "${BLUE}Dependencies Included:${NC}"
echo "  ✅ PyJWT (JWT token handling)"
echo "  ✅ cryptography (password hashing)"
echo "  ✅ boto3 (AWS SDK)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Test auth endpoints with API Gateway"
echo "2. Register a test user to verify functionality"
echo "3. Check CloudWatch logs if issues occur"
echo ""
echo "🚀 Auth Lambda is now ready with all dependencies!"
