#!/bin/bash

# Learning Assistant Frontend Deployment Script
# Deploys React app to S3 as a static website

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUCKET_NAME="${S3_BUCKET_NAME:-aischool.seedlinglabs.com}"
AWS_REGION="${AWS_REGION:-us-west-2}"
BUILD_DIR="build"
PROFILE="${AWS_PROFILE:-default}"

# Function to print colored output
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check AWS CLI configuration
check_aws_config() {
    log "Checking AWS CLI configuration..."
    
    if ! command_exists aws; then
        error "AWS CLI is not installed. Please install it first."
        echo "Installation instructions: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
    
    # Check if AWS credentials are configured
    if ! aws sts get-caller-identity --profile "$PROFILE" >/dev/null 2>&1; then
        error "AWS credentials not configured for profile: $PROFILE"
        echo "Please run: aws configure --profile $PROFILE"
        exit 1
    fi
    
    # Get AWS account info
    ACCOUNT_ID=$(aws sts get-caller-identity --profile "$PROFILE" --query Account --output text)
    log "Using AWS Account: $ACCOUNT_ID"
    success "AWS CLI configuration verified"
}

# Function to check if bucket name is available globally
check_bucket_name() {
    log "Checking if bucket name '$BUCKET_NAME' is available..."
    
    if aws s3api head-bucket --bucket "$BUCKET_NAME" --profile "$PROFILE" 2>/dev/null; then
        log "Bucket '$BUCKET_NAME' already exists"
        return 0
    else
        # Check if bucket exists in another region/account
        if aws s3api head-bucket --bucket "$BUCKET_NAME" --profile "$PROFILE" 2>&1 | grep -q "Forbidden"; then
            error "Bucket '$BUCKET_NAME' exists but is owned by another AWS account"
            echo "Please choose a different bucket name by setting S3_BUCKET_NAME environment variable"
            echo "Example: S3_BUCKET_NAME=my-unique-bucket-name ./deploy-frontend.sh"
            exit 1
        fi
        log "Bucket name '$BUCKET_NAME' is available"
        return 1
    fi
}

# Function to create S3 bucket
create_s3_bucket() {
    log "Creating S3 bucket: $BUCKET_NAME"
    
    if [[ "$AWS_REGION" == "us-east-1" ]]; then
        # us-east-1 doesn't need LocationConstraint
        aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --profile "$PROFILE" \
            --region "$AWS_REGION"
    else
        # Other regions need LocationConstraint
        aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --profile "$PROFILE" \
            --region "$AWS_REGION" \
            --create-bucket-configuration LocationConstraint="$AWS_REGION"
    fi
    
    success "S3 bucket '$BUCKET_NAME' created successfully"
}

# Function to configure bucket for static website hosting
configure_website_hosting() {
    log "Configuring bucket for static website hosting..."
    
    # Enable static website hosting
    aws s3api put-bucket-website \
        --bucket "$BUCKET_NAME" \
        --profile "$PROFILE" \
        --website-configuration '{
            "IndexDocument": {"Suffix": "index.html"},
            "ErrorDocument": {"Key": "index.html"}
        }'
    
    # Set bucket policy to make it publicly readable
    POLICY=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF
)
    
    aws s3api put-bucket-policy \
        --bucket "$BUCKET_NAME" \
        --profile "$PROFILE" \
        --policy "$POLICY"
    
    # Disable block public access settings
    aws s3api delete-public-access-block \
        --bucket "$BUCKET_NAME" \
        --profile "$PROFILE"
    
    success "Bucket configured for public static website hosting"
}

# Function to build React app
build_react_app() {
    log "Building React application..."
    
    if [[ ! -f "package.json" ]]; then
        error "package.json not found. Please run this script from the project root directory."
        exit 1
    fi
    
    # Install dependencies if node_modules doesn't exist
    if [[ ! -d "node_modules" ]]; then
        log "Installing dependencies..."
        npm install
    fi
    
    # Build the application
    npm run build
    
    if [[ ! -d "$BUILD_DIR" ]]; then
        error "Build failed - $BUILD_DIR directory not found"
        exit 1
    fi
    
    success "React app built successfully"
}

# Function to upload files to S3
upload_to_s3() {
    log "Uploading files to S3 bucket..."
    
    # Sync files to S3 with proper cache headers
    aws s3 sync "$BUILD_DIR/" "s3://$BUCKET_NAME/" \
        --profile "$PROFILE" \
        --delete \
        --cache-control "max-age=31536000" \
        --exclude "*.html" \
        --exclude "*.json" \
        --exclude "*.xml" \
        --exclude "*.txt"
    
    # Upload HTML and JSON files with no-cache headers
    aws s3 sync "$BUILD_DIR/" "s3://$BUCKET_NAME/" \
        --profile "$PROFILE" \
        --cache-control "no-cache" \
        --include "*.html" \
        --include "*.json" \
        --include "*.xml" \
        --include "*.txt"
    
    success "Files uploaded to S3 successfully"
}

# Function to display deployment information
show_deployment_info() {
    WEBSITE_URL="http://$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"
    CONSOLE_URL="https://s3.console.aws.amazon.com/s3/buckets/$BUCKET_NAME"
    
    echo ""
    echo "🎉 Frontend Deployment Complete!"
    echo "=================================="
    echo ""
    echo "📱 Website URL:"
    echo "   $WEBSITE_URL"
    echo ""
    echo "🪣 S3 Bucket:"
    echo "   Name: $BUCKET_NAME"
    echo "   Region: $AWS_REGION"
    echo "   Console: $CONSOLE_URL"
    echo ""
    echo "🔧 Configuration:"
    echo "   AWS Profile: $PROFILE"
    echo "   Build Directory: $BUILD_DIR"
    echo ""
    echo "💡 Next Steps:"
    echo "   1. Test your website at the URL above"
    echo "   2. Set up CloudFront for HTTPS and better performance"
    echo "   3. Configure a custom domain name"
    echo "   4. Set up CI/CD for automatic deployments"
    echo ""
    success "Your Learning Assistant is now live!"
}

# Main deployment function
main() {
    echo "🚀 Learning Assistant Frontend Deployment"
    echo "=========================================="
    echo ""
    
    # Check prerequisites
    check_aws_config
    
    # Build React app
    build_react_app
    
    # Check if bucket exists
    if check_bucket_name; then
        log "Using existing bucket: $BUCKET_NAME"
    else
        create_s3_bucket
        configure_website_hosting
    fi
    
    # Upload files
    upload_to_s3
    
    # Show deployment info
    show_deployment_info
}

# Help function
show_help() {
    echo "Learning Assistant Frontend Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Environment Variables:"
    echo "  S3_BUCKET_NAME    S3 bucket name (default: aischool.seedlinglabs.com)"
    echo "  AWS_REGION        AWS region (default: us-west-2)"
    echo "  AWS_PROFILE       AWS profile (default: default)"
    echo ""
    echo "Options:"
    echo "  -h, --help        Show this help message"
    echo "  -b, --bucket      S3 bucket name"
    echo "  -r, --region      AWS region"
    echo "  -p, --profile     AWS profile"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Deploy with defaults"
    echo "  $0 -b my-app-frontend -r us-east-1   # Custom bucket and region"
    echo "  S3_BUCKET_NAME=my-bucket $0          # Using environment variable"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -b|--bucket)
            BUCKET_NAME="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -p|--profile)
            PROFILE="$2"
            shift 2
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main
