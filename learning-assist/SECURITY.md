# 🔐 Security Guide - Learning Assistant

## 🚨 Critical Security Overview

This document outlines the security architecture and best practices for deploying the Learning Assistant in production with multiple teachers.

## ❌ **NEVER DO THIS** - Security Anti-Patterns

### **Frontend API Key Exposure**
```javascript
// ❌ NEVER - This exposes your API key to all users
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
```

**Why this is dangerous:**
- API key is bundled into client-side code
- Anyone can inspect browser and extract your key
- Unlimited usage by malicious users
- No usage tracking or rate limiting
- Single point of failure

### **Environment Files in Git**
```bash
# ❌ NEVER commit these files
.env
.env.local
.env.production
```

## ✅ **Secure Architecture** - Best Practices

### **1. Backend API Proxy Pattern**

```
[Frontend] → [AWS API Gateway] → [Lambda Proxy] → [Gemini API]
```

**Benefits:**
- ✅ API key hidden on server-side
- ✅ Usage tracking per user
- ✅ Rate limiting protection
- ✅ Cost control
- ✅ Centralized monitoring

### **2. Environment Variable Security**

#### **Development:**
```bash
# Local development only - NEVER commit
export GEMINI_API_KEY="your-development-key"
```

#### **Production:**
```bash
# AWS Lambda Environment Variables (encrypted at rest)
aws lambda update-function-configuration \
  --function-name learning-assist-gemini-proxy \
  --environment Variables="{GEMINI_API_KEY=your-production-key}"
```

### **3. Multi-Tenant Key Management**

#### **Option A: Single Shared Key (Recommended for Schools)**
- One Gemini API key for the entire school
- Usage tracked per teacher
- Centralized billing and monitoring
- Rate limits prevent abuse

#### **Option B: Per-Teacher Keys (Enterprise)**
- Each teacher has their own API key
- Individual billing and limits
- More complex to manage
- Better isolation

#### **Option C: Hierarchical Keys (Advanced)**
- School-level master key
- Department-level sub-keys
- Teacher-level quotas
- Advanced usage analytics

## 🛠️ **Implementation Guide**

### **Step 1: Deploy Secure Backend Proxy**

```bash
cd backend

# Set your API key (do this securely)
export GEMINI_API_KEY="your-actual-gemini-api-key"

# Deploy the secure proxy
./deploy-gemini-proxy.sh
```

### **Step 2: Update Frontend to Use Proxy**

```typescript
// ✅ SECURE - Uses backend proxy
import { secureGeminiService } from '../services/secureGeminiService';

// No API key needed in frontend!
const result = await secureGeminiService.generateTopicContent(
  topicName, description, documentUrls, classLevel, subject
);
```

### **Step 3: Remove Frontend API Key Dependencies**

```bash
# Remove any .env files with API keys
rm .env .env.local

# Update components to use secure service
# (Replace GeminiService with secureGeminiService)
```

### **Step 4: Configure Production Environment**

```bash
# Production deployment
export GEMINI_API_KEY="your-production-key"
./deploy-gemini-proxy.sh

# Verify security
./check-status.sh
```

## 📊 **Usage Monitoring & Rate Limiting**

### **Built-in Protections:**
- **Daily Rate Limits**: 100 requests per user per day
- **Usage Tracking**: All requests logged to DynamoDB
- **Cost Monitoring**: Track API usage and costs
- **Error Handling**: Graceful degradation on limits

### **Monitoring Dashboard:**
```bash
# View usage statistics
aws dynamodb scan --table-name learning_assist_gemini_usage

# Check current limits
aws lambda get-function-configuration --function-name learning-assist-gemini-proxy
```

## 🔧 **Configuration Options**

### **Rate Limiting Configuration:**
```python
# In gemini_lambda_function.py
MAX_DAILY_REQUESTS = 100  # Adjust per your needs
MAX_MONTHLY_REQUESTS = 2000
COST_LIMIT_USD = 50.00
```

### **Usage Tiers:**
```python
USAGE_TIERS = {
    'basic_teacher': {'daily': 50, 'monthly': 1000},
    'premium_teacher': {'daily': 200, 'monthly': 5000},
    'admin': {'daily': 500, 'monthly': 10000}
}
```

## 🎯 **Production Deployment Checklist**

### **Pre-Deployment:**
- [ ] Remove all API keys from frontend code
- [ ] Update .gitignore to exclude sensitive files
- [ ] Test secure proxy endpoints
- [ ] Configure appropriate rate limits
- [ ] Set up monitoring alerts

### **Deployment:**
- [ ] Deploy backend proxy with production API key
- [ ] Update frontend to use secure service
- [ ] Test end-to-end functionality
- [ ] Verify rate limiting works
- [ ] Check usage tracking

### **Post-Deployment:**
- [ ] Monitor usage patterns
- [ ] Set up billing alerts
- [ ] Train teachers on usage limits
- [ ] Document incident response procedures
- [ ] Regular security audits

## 🚨 **Incident Response**

### **If API Key is Compromised:**
1. **Immediately** revoke the compromised key in Google Cloud Console
2. Generate a new API key
3. Update Lambda environment variables
4. Deploy updated configuration
5. Monitor for unusual usage patterns
6. Review access logs

### **If Usage Limits are Exceeded:**
1. Check usage dashboard for patterns
2. Identify high-usage users
3. Adjust rate limits if legitimate
4. Contact users if abuse is suspected
5. Consider upgrading API quotas

## 💰 **Cost Management**

### **Monitoring Costs:**
- Set up Google Cloud billing alerts
- Track usage per teacher/department
- Monitor API quotas and pricing
- Regular cost reviews

### **Cost Optimization:**
- Implement caching for repeated requests
- Use appropriate model sizes
- Optimize prompts for efficiency
- Consider batch processing

## 📚 **Additional Security Resources**

- [Google Cloud API Security Best Practices](https://cloud.google.com/docs/security/best-practices-for-securing-your-api)
- [AWS Lambda Security Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/lambda-security.html)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

## 🆘 **Support & Questions**

For security-related questions or incidents:
1. Check this documentation first
2. Review CloudWatch logs for errors
3. Contact your system administrator
4. For critical issues, immediately disable the service

---

**Remember: Security is everyone's responsibility. When in doubt, err on the side of caution.**
