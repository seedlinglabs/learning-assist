#!/bin/bash

# Sprout AI Parent App Deployment Script
# This script builds and deploys the parent PWA app to AWS S3

set -e  # Exit on error

# Configuration
BUCKET_NAME="sprout-ai-parent-app"
REGION="us-west-2"
CLOUDFRONT_DIST_ID=""  # Add your CloudFront distribution ID here if using CloudFront

echo "🚀 Starting Sprout AI Parent App Deployment..."
echo "================================================"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI is not installed"
    echo "Please install it: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in parent-app directory"
    echo "Please run this script from the parent-app directory"
    exit 1
fi

# Build production version
echo ""
echo "📦 Step 1: Building production version..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build complete!"

# Deploy to S3
echo ""
echo "☁️  Step 2: Uploading to S3 bucket: $BUCKET_NAME..."
aws s3 sync build/ s3://$BUCKET_NAME/ \
    --region $REGION \
    --delete

if [ $? -ne 0 ]; then
    echo "❌ Upload failed!"
    exit 1
fi

echo "✅ Upload complete!"

# Set proper cache headers for service worker
echo ""
echo "⚙️  Step 3: Setting cache headers..."

# Service worker should never be cached (check both possible names)
if aws s3 ls s3://$BUCKET_NAME/sw.js --region $REGION > /dev/null 2>&1; then
    aws s3 cp s3://$BUCKET_NAME/sw.js s3://$BUCKET_NAME/sw.js \
        --region $REGION \
        --metadata-directive REPLACE \
        --cache-control "max-age=0, no-cache, no-store, must-revalidate" \
        --content-type "application/javascript"
fi

if aws s3 ls s3://$BUCKET_NAME/service-worker.js --region $REGION > /dev/null 2>&1; then
    aws s3 cp s3://$BUCKET_NAME/service-worker.js s3://$BUCKET_NAME/service-worker.js \
        --region $REGION \
        --metadata-directive REPLACE \
        --cache-control "max-age=0, no-cache, no-store, must-revalidate" \
        --content-type "application/javascript"
fi

# Manifest should also not be cached
aws s3 cp s3://$BUCKET_NAME/manifest.json s3://$BUCKET_NAME/manifest.json \
    --region $REGION \
    --metadata-directive REPLACE \
    --cache-control "max-age=0, no-cache, no-store, must-revalidate" \
    --content-type "application/json"

# HTML files should not be cached
aws s3 cp s3://$BUCKET_NAME/index.html s3://$BUCKET_NAME/index.html \
    --region $REGION \
    --metadata-directive REPLACE \
    --cache-control "max-age=0, no-cache, no-store, must-revalidate" \
    --content-type "text/html"

echo "✅ Cache headers set!"

# Invalidate CloudFront cache if distribution ID is provided
if [ ! -z "$CLOUDFRONT_DIST_ID" ]; then
    echo ""
    echo "🔄 Step 4: Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id $CLOUDFRONT_DIST_ID \
        --paths "/*"
    
    if [ $? -eq 0 ]; then
        echo "✅ CloudFront cache invalidated!"
    else
        echo "⚠️  CloudFront invalidation failed (non-critical)"
    fi
fi

# Get website URL
echo ""
echo "================================================"
echo "✅ Deployment Complete!"
echo "================================================"
echo ""
echo "📱 Your PWA is now live at:"
echo "   http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
echo ""

if [ ! -z "$CLOUDFRONT_DIST_ID" ]; then
    echo "🌐 CloudFront URL (if configured):"
    echo "   https://your-custom-domain.com"
    echo ""
fi

echo "📋 Next Steps:"
echo "   1. Test the app on mobile devices (Android & iOS)"
echo "   2. Try installing it as a PWA (Add to Home Screen)"
echo "   3. Share the URL with parents"
echo ""
echo "💡 Tip: For full PWA features, ensure you're using HTTPS (via CloudFront)"
echo ""

