#!/bin/bash

# Learning Assistant Frontend Deployment Script
# Deploys React app to AWS S3 as a static website

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEFAULT_BUCKET_NAME="aischool.seedlinglabs.com"
DEFAULT_REGION="us-west-2"
DEFAULT_PROFILE="default"

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

echo -e "${BLUE}🚀 Deploying Learning Assistant Frontend...${NC}"
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

# Build React app
echo "📦 Building React app..."
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
fi

npm run build

if [ ! -d "build" ]; then
    echo -e "${RED}❌ Build failed. No build directory found.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ React app built successfully${NC}"

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

# Configure bucket for static website hosting
echo "🌐 Configuring static website hosting..."
aws s3 website "s3://$BUCKET_NAME" \
    --index-document index.html \
    --error-document index.html \
    --profile $PROFILE

# Make bucket publicly readable
echo "🔓 Making bucket publicly readable..."
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

# Remove public access block
aws s3api delete-public-access-block --bucket $BUCKET_NAME --profile $PROFILE

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
echo -e "${GREEN}🎉 Frontend Deployment Complete!${NC}"
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
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "   1. Test your website at the URL above"
echo "   2. Set up CloudFront for HTTPS and better performance"
echo "   3. Configure a custom domain name"
echo "   4. Set up CI/CD for automatic deployments"
echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"