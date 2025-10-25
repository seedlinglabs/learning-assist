#!/bin/bash
set -e

echo "🚀 Quick deploy to DEV with Login UI..."

# Backup original LoginForm
cp src/components/LoginForm.tsx src/components/LoginForm.tsx.backup

# Change to Login UI
sed -i '' "s/'Create Account'/'Register'/g" src/components/LoginForm.tsx
sed -i '' "s/'Sign In'/'Login'/g" src/components/LoginForm.tsx  
sed -i '' "s/Sign in to your account/Login to continue/g" src/components/LoginForm.tsx
sed -i '' "s/Join the Learning Assistant platform/Create your account to continue/g" src/components/LoginForm.tsx

# Build
echo "📦 Building..."
npm run build 2>&1 | tail -10

# Deploy
echo "📤 Deploying..."
/opt/homebrew/bin/aws s3 sync build/ "s3://aischool.dev.seedlinglabs.com" \
  --delete \
  --profile AdministratorAccess-143320675925 \
  --cache-control "no-cache, no-store, must-revalidate" 2>&1 | grep -E "upload:|delete:" | tail -10

# Restore
mv src/components/LoginForm.tsx.backup src/components/LoginForm.tsx

echo ""
echo "✅ DEV Deployment Complete!"
echo "🌐 http://aischool.dev.seedlinglabs.com.s3-website-us-west-2.amazonaws.com"
echo "🔄 Hard refresh: Cmd+Shift+R"
echo ""
echo "📋 New Features:"
echo "  ✅ PDF/Word export for assessments and worksheets"
echo "  ✅ YouTube-only video validation"
echo "  ✅ Embedded YouTube player (privacy-enhanced mode)"
echo "  ✅ Non-YouTube videos filtered with warning"
