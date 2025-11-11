# 🚀 Quick Reference Card

## Project URLs

| Environment | URL |
|-------------|-----|
| **Production** | http://aischool.seedlinglabs.com.s3-website-us-west-2.amazonaws.com |
| **Development** | http://aischool.dev.seedlinglabs.com.s3-website-us-west-2.amazonaws.com |
| **API Gateway** | https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod |

---

## Essential Commands

### Frontend Development

```bash
# Start development server
cd learning-assist/learning-assist
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Backend Deployment

```bash
cd learning-assist/learning-assist/backend

# Deploy everything
./deploy-topics-only.sh
./deploy-auth-only.sh
./deploy-api-gateway.sh
./enable-cors.sh

# Check status
./check-status.sh
```

### Frontend Deployment

```bash
# Deploy to production
./deploy-frontend.sh

# Deploy to development
./deploy-frontend-dev.sh
```

---

## Project Structure (Key Files)

```
learning-assist/
├── src/
│   ├── App.tsx                      # Main app component
│   ├── components/
│   │   ├── TopicTabbedView.tsx      # ⭐ Most complex component
│   │   ├── LoginForm.tsx            # Authentication UI
│   │   └── AdminDashboard.tsx       # Admin panel
│   ├── context/
│   │   ├── AppContext.tsx           # ⭐ Global state management
│   │   ├── AuthContext.tsx          # ⭐ Authentication state
│   │   └── ThemeContext.tsx         # Theme management
│   ├── services/
│   │   ├── api.ts                   # ⭐ Topics API client
│   │   ├── authService.ts           # ⭐ Auth API client
│   │   └── secureGeminiService.ts   # ⭐ AI content generation
│   └── types/index.ts               # ⭐ TypeScript interfaces
│
└── backend/
    ├── lambda_function.py           # ⭐ Topics Lambda
    ├── auth_lambda_function.py      # ⭐ Auth Lambda
    └── gemini_lambda_function.py    # ⭐ Gemini proxy Lambda
```

---

## Data Hierarchy

```
School
  └── Class (e.g., "Grade 6 - Section A")
      └── Subject (e.g., "Science")
          └── Topic (e.g., "Photosynthesis")
              ├── Overview
              ├── Lesson Plan (AI-generated)
              ├── Teaching Guide (AI-generated)
              ├── Group Discussion (AI-generated)
              ├── Assessment (AI-generated)
              ├── Worksheets (AI-generated)
              ├── Images
              └── Videos
```

---

## User Roles & Permissions

| Feature | Teacher | Parent | Student | Admin |
|---------|---------|--------|---------|-------|
| View content | ✅ | ✅ (assigned classes only) | ✅ (assigned classes only) | ✅ |
| Create/Edit topics | ✅ | ❌ | ❌ | ✅ |
| Generate AI content | ✅ | ❌ | ❌ | ✅ |
| User management | ❌ | ❌ | ❌ | ✅ |
| Academic records | ❌ | ✅ (own children) | ❌ | ✅ |

---

## API Endpoints

### Topics API

```bash
GET    /topics
GET    /topics?subject_id={id}
GET    /topics/{id}
POST   /topics
PUT    /topics/{id}
DELETE /topics/{id}
POST   /topics/extract-pdf
```

### Auth API

```bash
POST   /auth/register
POST   /auth/login
GET    /auth/verify
GET    /auth/user/{id}
PUT    /auth/user/{id}
GET    /auth/users?user_type={type}
```

### Gemini Proxy

```bash
POST   /gemini/generate-content
POST   /gemini/discover-documents
POST   /gemini/enhance-section
POST   /gemini/analyze-chapter
```

### Academic Records

```bash
POST   /academic-records
GET    /academic-records/{record_id}/{topic_id}
PUT    /academic-records/{record_id}/{topic_id}
DELETE /academic-records/{record_id}/{topic_id}
GET    /academic-records?parent_phone={phone}
GET    /academic-records?teacher_id={id}
GET    /academic-records?school_id={id}
```

---

## DynamoDB Tables

| Table Name | Primary Key | GSI | Purpose |
|------------|-------------|-----|---------|
| `learning_assist_topics` | `id` (PK) | `subject_id` | Store topic data |
| `learning_assist_users` | `user_id` (PK) | `email` | Store user accounts |
| `academic_records` | `record_id` (PK) + `topic_id` (SK) | `parent_phone`, `teacher_id`, `school_id` | Track topic completion |

---

## Context API Methods

### AuthContext

```typescript
const { user, isAuthenticated, login, logout, hasRole, canAccessClass } = useAuth();

// Check if user is a teacher
if (hasRole('teacher')) { /* ... */ }

// Check if user can access a class
if (canAccessClass('class-123')) { /* ... */ }
```

### AppContext

```typescript
const { schools, currentPath, setCurrentPath, addTopic, updateTopic, deleteTopic } = useApp();

// Navigate to a topic
setCurrentPath({ school, class: cls, subject, topic });

// Create a new topic
await addTopic(subjectId, { name: 'New Topic', description: '...' });

// Update a topic
await updateTopic(topicId, { aiContent: { lessonPlan: '...' } });
```

---

## Common Debugging Steps

### 1. Check Browser Console
Press **F12** → Console tab → Look for red errors

### 2. Check Lambda Logs

```bash
# Topics Lambda
aws logs tail /aws/lambda/learning-assist-topics --follow

# Auth Lambda
aws logs tail /aws/lambda/learning-assist-auth --follow
```

### 3. Test API Endpoint

```bash
# Test topics endpoint
curl https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics

# Test with auth token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/auth/verify
```

### 4. Check CORS

```bash
cd backend
./enable-cors.sh
./enable-cors-academic-records.sh
```

---

## Common Issues & Solutions

### Issue: "Cannot read property 'map' of undefined"

**Solution**: Add optional chaining
```typescript
{topics?.map(topic => <TopicCard topic={topic} />)}
```

### Issue: CORS errors

**Solution**: Re-enable CORS
```bash
cd backend
./enable-cors.sh
```

### Issue: Token expired

**Solution**: Logout and login again

### Issue: AI content not generating

**Solution**: Check Lambda logs
```bash
aws logs tail /aws/lambda/learning-assist-gemini-proxy --follow
```

---

## Environment Variables

### Frontend (.env.local)

```bash
REACT_APP_YOUTUBE_API_KEY=your_key
REACT_APP_UNSPLASH_ACCESS_KEY=your_key
REACT_APP_PEXELS_API_KEY=your_key
REACT_APP_GEMINI_API_KEY=your_key  # Legacy, optional
```

### Backend (Lambda Environment Variables)

- Set in AWS Console → Lambda → Configuration → Environment variables
- Or set during deployment in deploy scripts

---

## Tech Stack Summary

### Frontend
- React 19.1.1
- TypeScript 4.9.5
- Lucide React (icons)
- jspdf, docx (export)
- pdfjs-dist (PDF parsing)

### Backend
- AWS Lambda (Python 3.x)
- AWS DynamoDB
- AWS API Gateway
- boto3, PyJWT, PyPDF2

### External APIs
- Google Gemini (AI)
- YouTube Data API v3
- Unsplash API
- Pexels API

---

## Deployment Checklist

- [ ] Backend Lambda functions deployed
- [ ] API Gateway routes configured
- [ ] CORS enabled on all routes
- [ ] Frontend built (`npm run build`)
- [ ] Frontend deployed to S3
- [ ] Test login functionality
- [ ] Test topic creation
- [ ] Test AI content generation
- [ ] Verify all tabs load correctly

---

## Useful AWS Console Links

- [Lambda Functions](https://console.aws.amazon.com/lambda/home?region=us-west-2#/functions)
- [DynamoDB Tables](https://console.aws.amazon.com/dynamodb/home?region=us-west-2#tables:)
- [API Gateway](https://console.aws.amazon.com/apigateway/main/apis?region=us-west-2)
- [S3 Buckets](https://s3.console.aws.amazon.com/s3/buckets?region=us-west-2)
- [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/home?region=us-west-2#logsV2:log-groups)

---

## Key Files to Read First

1. `ONBOARDING_GUIDE.md` - Complete guide (you are here!)
2. `learning-assist/README.md` - Project overview
3. `src/App.tsx` - Main app component
4. `src/context/AppContext.tsx` - Global state
5. `src/context/AuthContext.tsx` - Authentication
6. `src/components/TopicTabbedView.tsx` - Main content display
7. `backend/lambda_function.py` - Topics API
8. `backend/auth_lambda_function.py` - Auth API

---

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# ... edit files ...

# Stage and commit
git add .
git commit -m "Add my feature"

# Push to remote
git push origin feature/my-feature

# Create pull request
# Review and merge
```

---

## Performance Tips

1. **Use React.memo()** for expensive components
2. **Implement pagination** for large lists
3. **Lazy load** heavy components
4. **Optimize images** before upload
5. **Use CDN** for static assets (CloudFront)
6. **Cache API responses** when appropriate

---

## Security Best Practices

1. ✅ **Never expose API keys** in frontend
2. ✅ **Use Lambda proxy** for external APIs
3. ✅ **Validate user permissions** before actions
4. ✅ **Sanitize user input** before display
5. ✅ **Use HTTPS** for all API calls
6. ✅ **Implement rate limiting** on APIs

---

## Next Actions

### For New Developers:

1. Read `ONBOARDING_GUIDE.md`
2. Run app locally (`npm start`)
3. Test all features manually
4. Read key files listed above
5. Make a small change
6. Deploy to dev environment

### For Debugging:

1. Check browser console (F12)
2. Check Lambda logs (CloudWatch)
3. Test API endpoints with curl
4. Enable debug logging
5. Check AWS service status

### For Deployment:

1. Test locally first
2. Deploy backend Lambda functions
3. Enable CORS
4. Build frontend (`npm run build`)
5. Deploy to S3
6. Test production environment

---

**Last Updated**: November 6, 2025

