# 🔧 Troubleshooting Guide - Sprout AI Learning Assistant

## Table of Contents

1. [Frontend Issues](#frontend-issues)
2. [Backend/API Issues](#backendapi-issues)
3. [Authentication Issues](#authentication-issues)
4. [AI Content Generation Issues](#ai-content-generation-issues)
5. [Database Issues](#database-issues)
6. [Deployment Issues](#deployment-issues)
7. [Performance Issues](#performance-issues)
8. [Browser-Specific Issues](#browser-specific-issues)
9. [Development Environment Issues](#development-environment-issues)
10. [Common Error Messages](#common-error-messages)

---

## Frontend Issues

### Issue: "Cannot read property 'map' of undefined"

**Error Message**:
```
TypeError: Cannot read property 'map' of undefined
```

**Cause**: Component trying to render an array that hasn't loaded yet or is undefined.

**Solution**:

```typescript
// ❌ Bad - will crash if topics is undefined
{topics.map(topic => <TopicCard topic={topic} />)}

// ✅ Good - safe with optional chaining
{topics?.map(topic => <TopicCard topic={topic} />)}

// ✅ Also good - conditional rendering
{topics && topics.map(topic => <TopicCard topic={topic} />)}

// ✅ Best - with loading state
{loading ? (
  <p>Loading...</p>
) : topics?.map(topic => <TopicCard topic={topic} />)}
```

---

### Issue: "Cannot read property 'x' of null"

**Error Message**:
```
TypeError: Cannot read property 'name' of null
```

**Cause**: Trying to access properties of a null object.

**Solution**:

```typescript
// ❌ Bad
<h1>{topic.name}</h1>

// ✅ Good - optional chaining
<h1>{topic?.name}</h1>

// ✅ Also good - conditional rendering
{topic && <h1>{topic.name}</h1>}

// ✅ Best - with fallback
<h1>{topic?.name || 'Untitled'}</h1>
```

---

### Issue: Infinite Re-render Loop

**Error Message**:
```
Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.
```

**Cause**: State update in render function or missing dependency array in useEffect.

**Common Causes**:

1. **Calling setState directly in render**:
```typescript
// ❌ Bad - causes infinite loop
const MyComponent = () => {
  const [count, setCount] = useState(0);
  setCount(count + 1); // WRONG!
  return <div>{count}</div>;
};

// ✅ Good - call in event handler
const MyComponent = () => {
  const [count, setCount] = useState(0);
  const handleClick = () => setCount(count + 1);
  return <button onClick={handleClick}>{count}</button>;
};
```

2. **Missing dependency array in useEffect**:
```typescript
// ❌ Bad - runs on every render
useEffect(() => {
  fetchData();
});

// ✅ Good - runs once on mount
useEffect(() => {
  fetchData();
}, []);

// ✅ Also good - runs when dependencies change
useEffect(() => {
  fetchData(topicId);
}, [topicId]);
```

---

### Issue: React Hook Warnings

**Error Message**:
```
Warning: React Hook useEffect has a missing dependency
```

**Solution**:

```typescript
// ❌ Bad - missing dependency
useEffect(() => {
  loadTopics(subjectId);
}, []);

// ✅ Good - include all dependencies
useEffect(() => {
  loadTopics(subjectId);
}, [subjectId, loadTopics]);

// ✅ Even better - use useCallback for functions
const loadTopics = useCallback((id: string) => {
  // load logic
}, []);

useEffect(() => {
  loadTopics(subjectId);
}, [subjectId, loadTopics]);
```

---

## Backend/API Issues

### Issue: CORS Errors

**Error Message**:
```
Access to fetch at 'https://...' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Symptoms**:
- API calls work in Postman but fail in browser
- Network tab shows "CORS error" or "Failed to fetch"
- Preflight OPTIONS request failing

**Solutions**:

1. **Re-enable CORS on API Gateway**:
```bash
cd backend
./enable-cors.sh
./enable-cors-academic-records.sh
```

2. **Verify CORS headers in Lambda response**:
```python
# In Lambda function
return {
    'statusCode': 200,
    'headers': {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    'body': json.dumps(result)
}
```

3. **Check API Gateway method configuration**:
- Go to AWS Console → API Gateway → Your API
- Select resource → Method (OPTIONS)
- Verify "Integration Response" has CORS headers
- Deploy API to stage after changes

**Testing CORS**:
```bash
# Test OPTIONS preflight request
curl -X OPTIONS https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

---

### Issue: API Returns 404 Not Found

**Error Message**:
```
404 Not Found
{"message": "Missing Authentication Token"}
```

**Causes & Solutions**:

1. **Incorrect API URL**:
```typescript
// Check src/services/api.ts
const API_BASE_URL = 'https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod';
// Make sure this matches your actual API Gateway URL
```

2. **Missing stage in URL**:
```bash
# ❌ Bad - missing /pre-prod stage
https://xvq11x0421.execute-api.us-west-2.amazonaws.com/topics

# ✅ Good - includes stage
https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics
```

3. **API Gateway route not configured**:
```bash
# List all routes
aws apigateway get-resources --rest-api-id xvq11x0421

# Check if your route exists
# If not, run:
cd backend
./deploy-api-gateway.sh
```

---

### Issue: API Returns 502 Bad Gateway

**Error Message**:
```
502 Bad Gateway
{"message": "Internal server error"}
```

**Causes**:
1. Lambda function crashed
2. Lambda timeout (exceeded max execution time)
3. Invalid response format from Lambda

**Solutions**:

1. **Check Lambda logs**:
```bash
# Tail logs in real-time
aws logs tail /aws/lambda/learning-assist-topics --follow

# Get recent logs
aws logs tail /aws/lambda/learning-assist-topics --since 30m
```

2. **Check Lambda function exists**:
```bash
aws lambda get-function --function-name learning-assist-topics
```

3. **Increase Lambda timeout**:
```bash
aws lambda update-function-configuration \
  --function-name learning-assist-topics \
  --timeout 30
```

4. **Test Lambda directly**:
```bash
aws lambda invoke \
  --function-name learning-assist-topics \
  --payload '{"httpMethod":"GET","path":"/topics"}' \
  response.json && cat response.json
```

---

### Issue: API Returns 500 Internal Server Error

**Error Message**:
```
500 Internal Server Error
{"error": "..."}
```

**Causes**: Lambda function has an unhandled exception

**Solutions**:

1. **Check Lambda logs** (most important):
```bash
aws logs tail /aws/lambda/learning-assist-topics --follow
```

2. **Common Lambda errors**:

a. **DynamoDB table not found**:
```bash
# Solution: Create table (Lambda auto-creates on first request)
# Just make any API call and wait 30 seconds
```

b. **Missing environment variables**:
```bash
# Check Lambda env vars
aws lambda get-function-configuration --function-name learning-assist-topics

# Update if needed
aws lambda update-function-configuration \
  --function-name learning-assist-topics \
  --environment Variables={JWT_SECRET=your_secret}
```

c. **Import errors (missing dependencies)**:
```bash
# Re-deploy with dependencies
cd backend
./deploy-topics-only.sh
```

---

## Authentication Issues

### Issue: "Token expired" or "Invalid token"

**Error Message**:
```
401 Unauthorized
{"error": "Token has expired"}
```

**Causes**:
1. JWT token expired (7-day default validity)
2. Token corrupted in localStorage
3. Token secret changed on backend

**Solutions**:

1. **Simple solution - Logout and login again**:
```typescript
// In browser console
localStorage.removeItem('token');
localStorage.removeItem('user');
location.reload();
```

2. **Extend token expiration** (backend):
```python
# In backend/auth_lambda_function.py
# Change from 7 days to 30 days
'exp': (datetime.utcnow() + timedelta(days=30))
```

3. **Auto-refresh token** (frontend - future enhancement):
```typescript
// Check token expiration before each request
// Refresh token if expiring soon
```

---

### Issue: "Email already registered"

**Error Message**:
```
400 Bad Request
{"error": "Email already registered"}
```

**Cause**: Trying to register with an email that already exists

**Solutions**:

1. **Login instead of register**
2. **Use different email**
3. **Delete existing user** (if test account):
```bash
# Get user details
aws dynamodb get-item \
  --table-name learning_assist_users \
  --key '{"user_id": {"S": "USER_ID"}}'

# Delete user
aws dynamodb delete-item \
  --table-name learning_assist_users \
  --key '{"user_id": {"S": "USER_ID"}}'
```

---

### Issue: Login fails with correct credentials

**Error Message**:
```
401 Unauthorized
{"error": "Invalid credentials"}
```

**Debug Steps**:

1. **Check Lambda logs**:
```bash
aws logs tail /aws/lambda/learning-assist-auth --follow
```

2. **Verify user exists**:
```bash
# Query by email
aws dynamodb query \
  --table-name learning_assist_users \
  --index-name email-index \
  --key-condition-expression "email = :email" \
  --expression-attribute-values '{":email":{"S":"teacher@test.com"}}'
```

3. **Test password hashing** (if user exists but login fails):
```python
# In Python console
import hashlib, base64
password = "password123"
salt = "USER_SALT_FROM_DB"
hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
print(base64.b64encode(hash).decode('utf-8'))
# Compare with stored password_hash
```

---

## AI Content Generation Issues

### Issue: "AI content not generating"

**Symptoms**:
- Click "Generate with AI" button
- Loading spinner shows
- Eventually times out or shows error

**Causes & Solutions**:

1. **Gemini Lambda not deployed**:
```bash
cd backend
./deploy-gemini-proxy.sh
```

2. **Gemini API key not set**:
```bash
# Check Lambda env vars
aws lambda get-function-configuration \
  --function-name learning-assist-gemini-proxy

# Should show GEMINI_API_KEY in Environment.Variables
# If not, set it:
aws lambda update-function-configuration \
  --function-name learning-assist-gemini-proxy \
  --environment Variables={GEMINI_API_KEY=your_key_here}
```

3. **Lambda timeout too short**:
```bash
# Increase timeout to 60 seconds
aws lambda update-function-configuration \
  --function-name learning-assist-gemini-proxy \
  --timeout 60
```

4. **Rate limit exceeded on Gemini API**:
```bash
# Check Lambda logs for rate limit errors
aws logs tail /aws/lambda/learning-assist-gemini-proxy --follow

# Solution: Wait and retry, or upgrade Gemini API plan
```

5. **Check Lambda logs for specific error**:
```bash
aws logs tail /aws/lambda/learning-assist-gemini-proxy --since 10m
```

---

### Issue: AI generates poor quality content

**Symptoms**:
- Content is too generic
- Doesn't match class level
- Ignores uploaded documents

**Solutions**:

1. **Upload relevant PDF documents** before generating
2. **Be specific in topic name and description**
3. **Adjust temperature in prompt** (in `secureGeminiService.ts`):
```typescript
generationConfig: {
  temperature: 0.7,  // Lower = more focused, Higher = more creative
  maxOutputTokens: 2000,
}
```

4. **Improve prompts** (in `secureGeminiService.ts`):
```typescript
const prompt = `
Generate a comprehensive lesson plan for:
- Topic: ${topicName}
- Class Level: ${classLevel}
- Duration: 45 minutes
- Format: Clear sections with learning objectives, materials, activities

${documents ? 'Based on these source materials:\n' + documents.join('\n\n') : ''}

Be specific, practical, and age-appropriate.
`;
```

---

## Database Issues

### Issue: DynamoDB table not found

**Error Message**:
```
500 Internal Server Error
{"error": "Requested resource not found: Table: learning_assist_topics not found"}
```

**Cause**: Table hasn't been created yet

**Solution**:
- Tables are auto-created on first Lambda invocation
- Make any API call (e.g., GET /topics)
- Wait 30 seconds for table to become active
- Retry original request

**Manual table creation** (if auto-creation fails):
```bash
# Check if table exists
aws dynamodb describe-table --table-name learning_assist_topics

# If not, Lambda will create it automatically
# Or create manually (not recommended - use Lambda auto-creation)
```

---

### Issue: DynamoDB throttling

**Error Message**:
```
ProvisionedThroughputExceededException
```

**Cause**: Too many read/write requests

**Solutions**:

1. **Increase provisioned capacity**:
```bash
aws dynamodb update-table \
  --table-name learning_assist_topics \
  --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=10
```

2. **Enable auto-scaling** (recommended for production):
```bash
# Via AWS Console:
# DynamoDB → Tables → learning_assist_topics → Additional settings
# → Enable auto scaling for read and write capacity
```

---

## Deployment Issues

### Issue: Frontend deployment fails

**Error Message**:
```
Error: S3 bucket already exists and is not owned by you
```

**Solution**:
```bash
# Use unique bucket name
./deploy-frontend.sh -b my-unique-bucket-name-$(date +%s)
```

---

### Issue: Lambda deployment fails

**Error Message**:
```
Error: An error occurred (AccessDeniedException) when calling the CreateFunction operation
```

**Cause**: Insufficient AWS permissions

**Required IAM Permissions**:
- `lambda:CreateFunction`
- `lambda:UpdateFunctionCode`
- `lambda:UpdateFunctionConfiguration`
- `iam:CreateRole`
- `iam:AttachRolePolicy`
- `dynamodb:CreateTable`
- `dynamodb:DescribeTable`

**Solution**:
1. Contact AWS admin to grant permissions
2. Or use AWS account with admin access

---

### Issue: "npm install" fails

**Common Errors**:

1. **EACCES permission error**:
```bash
# Solution: Don't use sudo, fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

2. **Network timeout**:
```bash
# Solution: Increase npm timeout
npm config set fetch-timeout 60000
npm install
```

3. **Incompatible Node version**:
```bash
# Check Node version
node --version
# Should be 14 or higher

# Upgrade if needed (using nvm)
nvm install 18
nvm use 18
```

---

## Performance Issues

### Issue: Slow initial load

**Symptoms**:
- App takes 5+ seconds to load
- Large bundle size

**Solutions**:

1. **Code splitting**:
```typescript
// Use React.lazy for heavy components
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));

// Wrap in Suspense
<Suspense fallback={<div>Loading...</div>}>
  <AdminDashboard />
</Suspense>
```

2. **Check bundle size**:
```bash
npm run build
# Look for large files in build/static/js/

# Analyze bundle
npx source-map-explorer build/static/js/*.js
```

3. **Optimize images**:
```bash
# Compress images before upload
# Use WebP format
# Lazy load images
```

---

### Issue: Slow API responses

**Symptoms**:
- Topics take 3+ seconds to load
- AI generation takes 20+ seconds

**Solutions**:

1. **Check Lambda logs for cold starts**:
```bash
aws logs tail /aws/lambda/learning-assist-topics --follow
# Look for "Duration: 3000ms" (cold start)
```

2. **Increase Lambda memory** (makes execution faster):
```bash
aws lambda update-function-configuration \
  --function-name learning-assist-topics \
  --memory-size 1024
```

3. **Implement caching** (frontend):
```typescript
// Cache API responses in memory
const cache = new Map();

const fetchTopics = async (subjectId: string) => {
  if (cache.has(subjectId)) {
    return cache.get(subjectId);
  }
  
  const topics = await topicsAPI.getBySubject(subjectId);
  cache.set(subjectId, topics);
  return topics;
};
```

---

## Browser-Specific Issues

### Issue: App works in Chrome but not Safari

**Common Issues**:

1. **localStorage disabled**:
```typescript
// Check if localStorage is available
const isLocalStorageAvailable = () => {
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return true;
  } catch (e) {
    return false;
  }
};
```

2. **Flexbox/Grid issues**:
```css
/* Add vendor prefixes */
display: -webkit-box;
display: -ms-flexbox;
display: flex;
```

---

### Issue: Dark mode doesn't persist

**Cause**: Theme state not saved to localStorage

**Solution**:
```typescript
// In ThemeContext.tsx
useEffect(() => {
  localStorage.setItem('theme', theme);
}, [theme]);
```

---

## Development Environment Issues

### Issue: Hot reload not working

**Symptoms**:
- Change file, browser doesn't update
- Have to manually refresh

**Solutions**:

1. **Restart dev server**:
```bash
# Stop server (Ctrl+C)
npm start
```

2. **Clear cache**:
```bash
# Remove node_modules and reinstall
rm -rf node_modules
npm install
```

3. **Check file watcher limit** (Linux):
```bash
# Increase file watchers
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Common Error Messages

### Error: "NetworkError when attempting to fetch resource"

**Possible Causes**:
1. Backend is down
2. Incorrect API URL
3. Network connectivity issues

**Debug Steps**:
```bash
# 1. Test API directly
curl https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics

# 2. Check Lambda function exists
aws lambda get-function --function-name learning-assist-topics

# 3. Check API Gateway
aws apigateway get-rest-apis
```

---

### Error: "Unexpected token < in JSON"

**Cause**: API returned HTML (error page) instead of JSON

**Debug Steps**:
1. Open Network tab in browser DevTools
2. Click failed request
3. Check "Response" tab
4. If it's HTML, read the error message
5. Common: 404 page or CORS error page

---

### Error: "Failed to compile"

**React compilation error**

**Common Causes**:
1. Syntax error in TypeScript/JavaScript
2. Missing import
3. Type error

**Solution**:
- Read error message carefully
- Go to file:line mentioned in error
- Fix syntax/type error
- Dev server will auto-restart

---

## Getting Help

### Debug Checklist

When something doesn't work, check in this order:

1. ✅ **Browser Console** (F12 → Console)
   - Look for red error messages
   - Check what the error says

2. ✅ **Network Tab** (F12 → Network)
   - Look for failed requests (red)
   - Check status code (404, 500, etc.)
   - Check response body

3. ✅ **Lambda Logs**:
```bash
aws logs tail /aws/lambda/FUNCTION_NAME --follow
```

4. ✅ **AWS Console**:
   - Lambda → Functions → Check if exists
   - API Gateway → APIs → Check routes
   - DynamoDB → Tables → Check tables exist

5. ✅ **API Direct Test**:
```bash
curl https://YOUR_API_URL/endpoint
```

### Information to Collect

When asking for help, include:

- **Error message** (exact text)
- **Browser console output** (screenshot or copy/paste)
- **Lambda logs** (if backend issue)
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Environment** (dev/production, browser, OS)

---

## Quick Fixes Reference

```bash
# CORS issues
cd backend && ./enable-cors.sh

# Redeploy Lambda
cd backend && ./deploy-topics-only.sh

# Clear localStorage
localStorage.clear(); location.reload();

# Restart dev server
Ctrl+C, then npm start

# Check Lambda logs
aws logs tail /aws/lambda/learning-assist-topics --follow

# Test API
curl https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics

# Clear npm cache
npm cache clean --force && rm -rf node_modules && npm install
```

---

**Last Updated**: November 6, 2025

