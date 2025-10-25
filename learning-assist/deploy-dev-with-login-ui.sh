#!/bin/bash
set -e

echo "🚀 Building and deploying DEV version with Login UI..."

# Backup original LoginForm
cp src/components/LoginForm.tsx src/components/LoginForm.tsx.backup

# Modify the UI text
echo "✏️  Changing UI text to 'Login'..."
sed -i '' "s/'Sign In'/'Login'/g" src/components/LoginForm.tsx
sed -i '' "s/'Create Account'/'Login'/g" src/components/LoginForm.tsx
sed -i '' "s/Sign in to your account/Login to continue/g" src/components/LoginForm.tsx
sed -i '' 's/"Don'\''t have an account?"/"Need to register?"/g' src/components/LoginForm.tsx
sed -i '' "s/'Already have an account?'/'Back to login?'/g" src/components/LoginForm.tsx

# Build
echo "📦 Building React app..."
npm run build

# Deploy to dev S3
echo "📤 Deploying to S3..."
/opt/homebrew/bin/aws s3 sync build/ "s3://aischool.dev.seedlinglabs.com" \
  --delete \
  --profile AdministratorAccess-143320675925 \
  --cache-control "no-cache, no-store, must-revalidate"

# Restore original
echo "🔄 Restoring original LoginForm..."
mv src/components/LoginForm.tsx.backup src/components/LoginForm.tsx

echo ""
echo "✅ DEV deployment complete!"
echo "🌐 URL: http://aischool.dev.seedlinglabs.com.s3-website-us-west-2.amazonaws.com"
echo "🔄 Hard refresh: Cmd+Shift+R"
