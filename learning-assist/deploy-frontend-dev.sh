#!/bin/bash

# Learning Assistant Frontend Deployment Script (DEV Environment)
# Deploys React app to AWS S3 as a static website with "Login" UI instead of "Sign Up"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values for DEV environment
DEFAULT_BUCKET_NAME="aischool.dev.seedlinglabs.com"
DEFAULT_REGION="us-west-2"
DEFAULT_PROFILE="AdministratorAccess-143320675925"

# Parse command line arguments
BUCKET_NAME=""
REGION=""
PROFILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--bucket)
            BUCKET_NAME="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -p|--profile)
            PROFILE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -b, --bucket BUCKET_NAME    S3 bucket name (default: $DEFAULT_BUCKET_NAME)"
            echo "  -r, --region REGION         AWS region (default: $DEFAULT_REGION)"
            echo "  -p, --profile PROFILE       AWS profile (default: $DEFAULT_PROFILE)"
            echo "  -h, --help                  Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

# Set defaults if not provided
BUCKET_NAME=${BUCKET_NAME:-$DEFAULT_BUCKET_NAME}
REGION=${REGION:-$DEFAULT_REGION}
PROFILE=${PROFILE:-$DEFAULT_PROFILE}

echo -e "${BLUE}🚀 Deploying Learning Assistant Frontend (DEV - Login UI)...${NC}"
echo "=================================="

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity --profile $PROFILE &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured for profile '$PROFILE'.${NC}"
    echo "Run: aws configure --profile $PROFILE"
    exit 1
fi

# Check Node.js and npm
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install it first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Backup original LoginForm
echo "📋 Creating backup of LoginForm..."
ORIGINAL_FILE="src/components/LoginForm.tsx"
BACKUP_FILE="src/components/LoginForm.tsx.backup"

cp "$ORIGINAL_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup created at $BACKUP_FILE${NC}"

# Modify LoginForm to change "Sign Up" to "Login"
echo "✏️  Modifying UI text (Sign Up → Login)..."

# Use sed to replace the text (macOS compatible)
sed -i.tmp "s/'Sign In'/'Login'/g" "$ORIGINAL_FILE"
sed -i.tmp "s/'Create Account'/'Login'/g" "$ORIGINAL_FILE"
sed -i.tmp "s/'Join the Learning Assistant platform'/'Login to continue'/g" "$ORIGINAL_FILE"
sed -i.tmp "s/\"Don't have an account?\"/\"Need to register?\"/g" "$ORIGINAL_FILE"
sed -i.tmp "s/'Already have an account?'/'Back to login?'/g" "$ORIGINAL_FILE"

# Remove temporary files created by sed
rm -f "$ORIGINAL_FILE.tmp"

echo -e "${GREEN}✅ UI text updated${NC}"

# Build React app
echo "📦 Building React app..."
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
fi

npm run build

if [ ! -d "build" ]; then
    echo -e "${RED}❌ Build failed. No build directory found.${NC}"
    # Restore original file
    mv "$BACKUP_FILE" "$ORIGINAL_FILE"
    exit 1
fi

echo -e "${GREEN}✅ React app built successfully${NC}"

# Restore original LoginForm
echo "🔄 Restoring original LoginForm..."
mv "$BACKUP_FILE" "$ORIGINAL_FILE"
echo -e "${GREEN}✅ Original file restored${NC}"

# Check if bucket exists
echo "🪣 Checking S3 bucket..."
if aws s3 ls "s3://$BUCKET_NAME" --profile $PROFILE &> /dev/null; then
    echo -e "${GREEN}✅ Bucket '$BUCKET_NAME' already exists${NC}"
else
    echo "🆕 Creating S3 bucket '$BUCKET_NAME'..."
    
    # Create bucket
    if [ "$REGION" = "us-east-1" ]; then
        aws s3 mb "s3://$BUCKET_NAME" --profile $PROFILE
    else
        aws s3 mb "s3://$BUCKET_NAME" --region $REGION --profile $PROFILE
    fi
    
    echo -e "${GREEN}✅ Bucket created${NC}"
fi

# Remove public access block first
echo "🔓 Removing public access block..."
aws s3api delete-public-access-block --bucket $BUCKET_NAME --profile $PROFILE 2>/dev/null || echo "Public access block already removed or not set"

# Configure bucket for static website hosting
echo "🌐 Configuring static website hosting..."
aws s3 website "s3://$BUCKET_NAME" \
    --index-document index.html \
    --error-document index.html \
    --profile $PROFILE

# Make bucket publicly readable
echo "📖 Setting bucket policy for public read..."
aws s3api put-bucket-policy --bucket $BUCKET_NAME --profile $PROFILE --policy "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
        {
            \"Sid\": \"PublicReadGetObject\",
            \"Effect\": \"Allow\",
            \"Principal\": \"*\",
            \"Action\": \"s3:GetObject\",
            \"Resource\": \"arn:aws:s3:::$BUCKET_NAME/*\"
        }
    ]
}"

echo -e "${GREEN}✅ Website hosting configured${NC}"

# Upload files
echo "📤 Uploading files to S3..."
aws s3 sync build/ "s3://$BUCKET_NAME" \
    --delete \
    --cache-control "public, max-age=31536000" \
    --exclude "*.html" \
    --exclude "*.json" \
    --profile $PROFILE

# Upload HTML and JSON files with no cache
aws s3 sync build/ "s3://$BUCKET_NAME" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --include "*.html" \
    --include "*.json" \
    --profile $PROFILE

echo -e "${GREEN}✅ Files uploaded successfully${NC}"

# Get website URL
WEBSITE_URL="http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"

echo ""
echo -e "${GREEN}🎉 DEV Frontend Deployment Complete!${NC}"
echo "=================================="
echo ""
echo -e "${BLUE}📱 Website URL:${NC}"
echo "   $WEBSITE_URL"
echo ""
echo -e "${BLUE}🪣 S3 Bucket:${NC}"
echo "   Name: $BUCKET_NAME"
echo "   Region: $REGION"
echo "   Console: https://s3.console.aws.amazon.com/s3/buckets/$BUCKET_NAME"
echo ""
echo -e "${BLUE}🔧 Configuration:${NC}"
echo "   AWS Profile: $PROFILE"
echo "   Build Directory: build"
echo "   Environment: DEV (Login UI)"
echo ""
echo -e "${YELLOW}💡 Key Differences from Production:${NC}"
echo "   - UI shows 'Login' instead of 'Create Account'"
echo "   - Deploys to: $BUCKET_NAME"
echo "   - Uses same backend Lambda functions"
echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"

