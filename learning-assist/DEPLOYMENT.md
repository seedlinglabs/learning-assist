# Learning Assistant Frontend Deployment Guide

This guide explains how to deploy the Learning Assistant React frontend to AWS S3 as a static website.

## Prerequisites

1. **AWS CLI installed and configured**
   ```bash
   # Install AWS CLI
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   
   # Configure AWS credentials
   aws configure
   ```

2. **Node.js and npm installed**
   ```bash
   # Check versions
   node --version
   npm --version
   ```

3. **AWS Permissions**
   Your AWS user/role needs these permissions:
   - `s3:CreateBucket`
   - `s3:DeleteBucket`
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:DeleteObject`
   - `s3:PutBucketPolicy`
   - `s3:PutBucketWebsite`
   - `s3:DeletePublicAccessBlock`

## Quick Deployment

### Option 1: Default Settings
```bash
./deploy-frontend.sh
```

This will:
- Build the React app
- Create S3 bucket: `aischool.seedlinglabs.com`
- Configure public static website hosting
- Upload all files
- Provide the website URL

### Option 2: Custom Bucket Name
```bash
./deploy-frontend.sh -b my-unique-bucket-name
```

### Option 3: Custom Region
```bash
./deploy-frontend.sh -r us-east-1
```

### Option 4: Using Environment Variables
```bash
S3_BUCKET_NAME=my-bucket AWS_REGION=us-east-1 ./deploy-frontend.sh
```

## What the Script Does

1. **Validates Prerequisites**
   - Checks AWS CLI installation
   - Verifies AWS credentials
   - Confirms Node.js/npm availability

2. **Builds React App**
   - Installs dependencies if needed
   - Runs `npm run build`
   - Creates optimized production bundle

3. **Creates S3 Bucket** (if doesn't exist)
   - Checks bucket name availability
   - Creates bucket in specified region
   - Configures for static website hosting

4. **Configures Website Hosting**
   - Enables static website hosting
   - Sets `index.html` as index document
   - Sets `index.html` as error document (for React Router)
   - Makes bucket publicly readable
   - Removes public access blocks

5. **Uploads Files**
   - Syncs all build files to S3
   - Sets appropriate cache headers
   - Static assets: 1 year cache
   - HTML/JSON: no cache

6. **Provides Deployment Info**
   - Website URL
   - S3 console link
   - Next steps for optimization

## Output

After successful deployment, you'll see:

```
🎉 Frontend Deployment Complete!
==================================

📱 Website URL:
   http://aischool.seedlinglabs.com.s3-website-us-west-2.amazonaws.com

🪣 S3 Bucket:
   Name: aischool.seedlinglabs.com
   Region: us-west-2
   Console: https://s3.console.aws.amazon.com/s3/buckets/aischool.seedlinglabs.com

🔧 Configuration:
   AWS Profile: default
   Build Directory: build

💡 Next Steps:
   1. Test your website at the URL above
   2. Set up CloudFront for HTTPS and better performance
   3. Configure a custom domain name
   4. Set up CI/CD for automatic deployments
```

## Security Features

✅ **Secure API Integration**
- All AI features use secure backend proxy
- No API keys exposed in frontend
- Rate limiting and usage tracking

✅ **Production Optimized**
- Minified JavaScript and CSS
- Optimized images and assets
- Proper cache headers

## Troubleshooting

### Common Issues

1. **"AWS credentials not configured"**
   ```bash
   aws configure
   # Enter your Access Key ID, Secret Key, Region, Output format
   ```

2. **"Bucket name already taken"**
   ```bash
   # Use a unique bucket name
   ./deploy-frontend.sh -b my-unique-learning-assist-$(date +%s)
   ```

3. **"Permission denied"**
   - Ensure your AWS user has the required S3 permissions
   - Check if you're using the correct AWS profile

4. **"Build failed"**
   ```bash
   # Install dependencies manually
   npm install
   npm run build
   ```

### Checking Deployment

1. **Visit the website URL** provided after deployment
2. **Check S3 console** for uploaded files
3. **Test all features** (login, topic creation, AI content generation)

## Next Steps

### 1. Set up CloudFront (Recommended)
- Provides HTTPS
- Global CDN for faster loading
- Custom domain support

### 2. Configure Custom Domain
- Route 53 for DNS management
- SSL certificate via ACM
- CloudFront distribution

### 3. Set up CI/CD
- GitHub Actions for automatic deployment
- Deploy on every push to main branch
- Environment-specific deployments

### 4. Monitoring and Analytics
- CloudWatch for performance monitoring
- Google Analytics for usage tracking
- Error tracking with Sentry

## File Structure After Deployment

```
S3 Bucket Contents:
├── index.html              # Main React app
├── static/
│   ├── css/
│   │   └── main.[hash].css # Minified styles
│   └── js/
│       ├── main.[hash].js  # Main application bundle
│       └── [chunk].[hash].js # Code-split chunks
├── favicon.ico
├── manifest.json
└── robots.txt
```

## Cost Optimization

- **S3 Storage**: ~$0.023 per GB per month
- **Data Transfer**: First 1 GB free, then $0.09 per GB
- **Requests**: $0.0004 per 1,000 GET requests

For a typical React app (~2MB), monthly costs are usually under $1.

## Support

If you encounter issues:
1. Check AWS CloudTrail for API call logs
2. Review S3 bucket permissions
3. Verify React app builds locally
4. Check browser console for JavaScript errors

The deployment script provides detailed error messages to help diagnose issues.
