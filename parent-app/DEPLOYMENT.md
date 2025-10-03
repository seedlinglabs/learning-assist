# Sprout AI Parent PWA - Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: AWS S3 + CloudFront (Recommended for Production)

#### Prerequisites
- AWS Account
- AWS CLI configured
- Domain name (optional but recommended)

#### Steps

1. **Create S3 Bucket**
```bash
aws s3 mb s3://sprout-ai-parent-app --region us-west-2
```

2. **Configure Bucket for Static Website Hosting**
```bash
aws s3 website s3://sprout-ai-parent-app/ \
  --index-document index.html \
  --error-document index.html
```

3. **Set Bucket Policy** (Create a file `bucket-policy.json`):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::sprout-ai-parent-app/*"
    }
  ]
}
```

Apply the policy:
```bash
aws s3api put-bucket-policy \
  --bucket sprout-ai-parent-app \
  --policy file://bucket-policy.json
```

4. **Deploy Built Files**
```bash
cd parent-app
aws s3 sync build/ s3://sprout-ai-parent-app/ --delete
```

5. **Set Correct Content Types and Cache Headers**
```bash
# Set service worker to no-cache
aws s3 cp s3://sprout-ai-parent-app/service-worker.js s3://sprout-ai-parent-app/service-worker.js \
  --metadata-directive REPLACE \
  --cache-control "max-age=0, no-cache, no-store, must-revalidate" \
  --content-type "application/javascript"

# Set manifest
aws s3 cp s3://sprout-ai-parent-app/manifest.json s3://sprout-ai-parent-app/manifest.json \
  --metadata-directive REPLACE \
  --content-type "application/json"
```

6. **Get Website URL**
```bash
echo "http://sprout-ai-parent-app.s3-website-us-west-2.amazonaws.com"
```

#### Optional: CloudFront for HTTPS (Required for PWA Features)

PWAs require HTTPS to work fully. Set up CloudFront:

1. Create CloudFront distribution pointing to S3 bucket
2. Use AWS Certificate Manager for SSL certificate
3. Point your domain (e.g., parents.sproutai.com) to CloudFront

---

### Option 2: Netlify (Easiest, Free Tier Available)

#### Steps

1. **Install Netlify CLI**
```bash
npm install -g netlify-cli
```

2. **Login to Netlify**
```bash
netlify login
```

3. **Deploy**
```bash
cd parent-app
netlify deploy --prod --dir=build
```

4. **Custom Domain** (Optional)
- Go to Netlify dashboard
- Add custom domain (e.g., parents.sproutai.com)
- Netlify provides free SSL automatically

---

### Option 3: Vercel (Easy, Free Tier Available)

#### Steps

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy**
```bash
cd parent-app
vercel --prod
```

---

## 📱 Making PWA Installable for Parents

### What Parents Need to Know

Once deployed to HTTPS, parents can install the app:

#### **On Android (Chrome/Edge)**
1. Visit the app URL in Chrome
2. Look for "Add to Home Screen" prompt
3. OR tap menu (⋮) → "Add to Home Screen"
4. App icon appears on home screen like a native app

#### **On iPhone/iPad (Safari)**
1. Visit the app URL in Safari
2. Tap the Share button (□ with arrow)
3. Scroll and tap "Add to Home Screen"
4. Name the app and tap "Add"
5. App icon appears on home screen

#### **On Desktop (Chrome/Edge)**
1. Visit the app URL
2. Look for install button (⊕) in address bar
3. OR menu → "Install Sprout AI..."
4. App opens in its own window

### Parent-Friendly Installation Guide

Create a simple guide for parents:

**📲 How to Install Sprout AI on Your Phone**

1. **Open your phone's web browser**
   - Android: Open Chrome
   - iPhone: Open Safari

2. **Go to:** `https://parents.sproutai.com` (your deployed URL)

3. **Login with your phone number**

4. **Install the app:**
   - Android: Tap the popup "Add to Home Screen" or tap menu → "Add to Home Screen"
   - iPhone: Tap Share button → "Add to Home Screen"

5. **You're done!** The app is now on your home screen like any other app.

---

## 🔄 Continuous Deployment

### Automated Deployment Script

Create `deploy-parent-app.sh`:

```bash
#!/bin/bash

echo "🚀 Deploying Sprout AI Parent App..."

# Navigate to parent-app directory
cd parent-app

# Build production version
echo "📦 Building production version..."
npm run build

# Deploy to S3 (change to your bucket name)
echo "☁️  Uploading to S3..."
aws s3 sync build/ s3://sprout-ai-parent-app/ --delete

# Invalidate CloudFront cache (if using CloudFront)
# aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"

# Set service worker to no-cache
echo "⚙️  Setting cache headers..."
aws s3 cp s3://sprout-ai-parent-app/service-worker.js s3://sprout-ai-parent-app/service-worker.js \
  --metadata-directive REPLACE \
  --cache-control "max-age=0, no-cache, no-store, must-revalidate" \
  --content-type "application/javascript"

echo "✅ Deployment complete!"
echo "📱 App URL: https://parents.sproutai.com"
```

Make it executable:
```bash
chmod +x deploy-parent-app.sh
```

---

## 🔐 Security & Performance Tips

### 1. Enable HTTPS
- **Required** for PWA features (service workers, notifications, etc.)
- Use CloudFront with ACM certificate (free)
- Or use Netlify/Vercel (automatic HTTPS)

### 2. Configure CORS
- Ensure your backend APIs allow requests from your PWA domain
- Update API Gateway CORS settings

### 3. Cache Strategy
- Service worker caches app shell for offline access
- API responses are fetched fresh each time

### 4. Performance
- Enable Brotli/Gzip compression on server
- Use CloudFront for CDN distribution
- Leverage browser caching for static assets

---

## 📊 Monitoring & Analytics

### Add Analytics (Optional)

Add Google Analytics or similar to track:
- Installation rates
- Active users
- Feature usage
- Quiz completion rates

---

## 🆘 Troubleshooting

### "Add to Home Screen" not showing?
- Ensure site is served over HTTPS
- Check that `manifest.json` is accessible
- Verify service worker is registered
- Check browser console for errors

### PWA not updating?
- Service worker caches aggressively
- Unregister service worker in DevTools
- Clear browser cache
- Redeploy with cache busting

### Videos not playing?
- Check API endpoints are accessible
- Verify CORS headers on backend
- Check network tab in DevTools

---

## 📞 Support

For deployment issues:
1. Check browser console for errors
2. Verify all API endpoints are working
3. Test on multiple devices
4. Check service worker status in DevTools

---

## 🎯 Next Steps After Deployment

1. **Test thoroughly** on real devices (Android & iOS)
2. **Share installation guide** with parents
3. **Monitor usage** and gather feedback
4. **Iterate** based on parent feedback
5. **Add push notifications** for topic updates (future enhancement)

---

**Remember:** PWAs work best on HTTPS and modern browsers (Chrome, Safari, Edge). Internet Explorer is not supported.

