# 🏗️ Architecture Diagram - Sprout AI Learning Assistant

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                 USERS                                    │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐           │
│  │ Teacher  │   │  Parent  │   │ Student  │   │  Admin   │           │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘           │
└───────┼──────────────┼──────────────┼──────────────┼──────────────────┘
        │              │              │              │
        └──────────────┴──────────────┴──────────────┘
                          │
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND APPLICATIONS                            │
│  ┌──────────────────────────────┐    ┌──────────────────────────────┐ │
│  │   Learning Assist (Main)     │    │      Parent App (Simple)     │ │
│  │                              │    │                              │ │
│  │  • React 19.1.1              │    │  • React 19.1.1              │ │
│  │  • TypeScript 4.9.5          │    │  • TypeScript 4.9.5          │ │
│  │  • Context API               │    │  • Simplified UI             │ │
│  │  • AI Content Generation     │    │  • Read-only access          │ │
│  │  • PDF/Word Export           │    │  • Progress tracking         │ │
│  │  • Image/Video Search        │    │                              │ │
│  │                              │    │                              │ │
│  │  Deployed on: AWS S3         │    │  Deployed on: AWS S3         │ │
│  │  URL: aischool.seedling...   │    │  URL: parent-app...          │ │
│  └──────────────┬───────────────┘    └──────────────┬───────────────┘ │
└─────────────────┼────────────────────────────────────┼─────────────────┘
                  │                                    │
                  │ REST API (HTTPS)                   │
                  ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         AWS API GATEWAY                                  │
│  Base URL: https://xvq11x0421.execute-api.us-west-2.amazonaws.com      │
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────────┐│
│  │ /topics        │  │ /auth          │  │ /academic-records         ││
│  │ /gemini        │  │                │  │                           ││
│  └────────┬───────┘  └────────┬───────┘  └────────┬──────────────────┘│
│           │                   │                    │                   │
│  • CORS Enabled               │                    │                   │
│  • Lambda Proxy Integration   │                    │                   │
│  • Stage: pre-prod            │                    │                   │
└───────────┼───────────────────┼────────────────────┼───────────────────┘
            │                   │                    │
            │                   │                    │
            ▼                   ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          AWS LAMBDA FUNCTIONS                            │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  learning-assist-topics                                         │   │
│  │  • Runtime: Python 3.x                                          │   │
│  │  • File: lambda_function.py                                     │   │
│  │  • Timeout: 30s                                                 │   │
│  │  • Memory: 512 MB                                               │   │
│  │  • Functions:                                                   │   │
│  │    - GET /topics                    (list all topics)           │   │
│  │    - GET /topics?subject_id={id}    (list by subject)           │   │
│  │    - GET /topics/{id}               (get one topic)             │   │
│  │    - POST /topics                   (create topic)              │   │
│  │    - PUT /topics/{id}               (update topic)              │   │
│  │    - DELETE /topics/{id}            (delete topic)              │   │
│  │    - POST /topics/extract-pdf       (extract PDF text)          │   │
│  │  • Dependencies: boto3, PyPDF2                                  │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              │                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  learning-assist-auth                                           │   │
│  │  • Runtime: Python 3.x                                          │   │
│  │  • File: auth_lambda_function.py                                │   │
│  │  • Timeout: 15s                                                 │   │
│  │  • Memory: 256 MB                                               │   │
│  │  • Functions:                                                   │   │
│  │    - POST /auth/register            (create account)            │   │
│  │    - POST /auth/login               (login - email/phone)       │   │
│  │    - GET /auth/verify               (verify JWT token)          │   │
│  │    - GET /auth/user/{id}            (get user details)          │   │
│  │    - PUT /auth/user/{id}            (update user)               │   │
│  │    - GET /auth/users?user_type={t}  (list users by type)        │   │
│  │  • Security: PBKDF2 password hashing, JWT tokens                │   │
│  │  • Dependencies: boto3, PyJWT, cryptography                     │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              │                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  learning-assist-gemini-proxy                                   │   │
│  │  • Runtime: Python 3.x                                          │   │
│  │  • File: gemini_lambda_function.py                              │   │
│  │  • Timeout: 60s                                                 │   │
│  │  • Memory: 1024 MB                                              │   │
│  │  • Functions:                                                   │   │
│  │    - POST /gemini/generate-content  (AI content generation)     │   │
│  │    - POST /gemini/discover-documents (document discovery)       │   │
│  │    - POST /gemini/enhance-section   (text enhancement)          │   │
│  │    - POST /gemini/analyze-chapter   (chapter analysis)          │   │
│  │  • Purpose: Secure proxy to hide API keys from frontend         │   │
│  │  • Dependencies: boto3, requests                                │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              │                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  learning-assist-academic-records                               │   │
│  │  • Runtime: Python 3.x                                          │   │
│  │  • File: academic_records_lambda_function.py                    │   │
│  │  • Timeout: 30s                                                 │   │
│  │  • Memory: 512 MB                                               │   │
│  │  • Functions:                                                   │   │
│  │    - POST /academic-records         (create record)             │   │
│  │    - GET /academic-records/{id}     (get record)                │   │
│  │    - PUT /academic-records/{id}     (update status)             │   │
│  │    - DELETE /academic-records/{id}  (delete record)             │   │
│  │    - GET /academic-records?...      (query by parent/teacher)   │   │
│  │  • Dependencies: boto3                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
            │                   │                    │         │
            │                   │                    │         │
            ▼                   ▼                    │         │
┌──────────────────────┐ ┌──────────────────────┐  │         │
│   AWS DynamoDB       │ │   AWS DynamoDB       │  │         │
│                      │ │                      │  │         │
│ learning_assist_     │ │ learning_assist_     │  │         │
│     topics           │ │     users            │  │         │
│                      │ │                      │  │         │
│ • PK: id             │ │ • PK: user_id        │  │         │
│ • GSI: subject_id    │ │ • GSI: email         │  │         │
│                      │ │                      │  │         │
│ Schema:              │ │ Schema:              │  │         │
│ - id (string)        │ │ - user_id (string)   │  │         │
│ - name               │ │ - email              │  │         │
│ - description        │ │ - password_hash      │  │         │
│ - subject_id         │ │ - salt               │  │         │
│ - school_id          │ │ - name               │  │         │
│ - class_id           │ │ - user_type          │  │         │
│ - documentLinks      │ │ - school_id          │  │         │
│ - aiContent          │ │ - class_access[]     │  │         │
│   - lessonPlan       │ │ - phone_number       │  │         │
│   - teachingGuide    │ │ - created_at         │  │         │
│   - assessmentQues...│ │ - updated_at         │  │         │
│   - worksheets       │ │                      │  │         │
│   - images[]         │ │                      │  │         │
│   - videos[]         │ │                      │  │         │
│ - created_at         │ │                      │  │         │
│ - updated_at         │ │                      │  │         │
└──────────────────────┘ └──────────────────────┘  │         │
                                                    │         │
                                                    ▼         │
                                         ┌──────────────────────┐
                                         │   AWS DynamoDB       │
                                         │                      │
                                         │ academic_records     │
                                         │                      │
                                         │ • PK: record_id      │
                                         │ • SK: topic_id       │
                                         │ • GSI: parent_phone  │
                                         │ • GSI: teacher_id    │
                                         │ • GSI: school_id     │
                                         │                      │
                                         │ Schema:              │
                                         │ - record_id (PK)     │
                                         │ - topic_id (SK)      │
                                         │ - academic_year      │
                                         │ - grade              │
                                         │ - section            │
                                         │ - subject_id         │
                                         │ - teacher_id         │
                                         │ - parent_phone       │
                                         │ - status             │
                                         │ - start_date         │
                                         │ - end_date           │
                                         └──────────────────────┘
                                                    │
                                                    │
                      ┌─────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL APIs                                     │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐│
│  │ Google Gemini    │  │ YouTube Data API │  │ Unsplash/Pexels API  ││
│  │                  │  │                  │  │                      ││
│  │ • AI content     │  │ • Video search   │  │ • Image search       ││
│  │   generation     │  │ • Video metadata │  │ • Educational images ││
│  │ • Document       │  │ • Embed videos   │  │ • Kid-safe content   ││
│  │   analysis       │  │                  │  │                      ││
│  │ • Models:        │  │                  │  │                      ││
│  │   - gemini-1.5-  │  │                  │  │                      ││
│  │     flash        │  │                  │  │                      ││
│  │   - gemini-1.5-  │  │                  │  │                      ││
│  │     pro          │  │                  │  │                      ││
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Examples

### 1. User Login Flow

```
┌──────────┐
│  User    │ 1. Enters email/password
└────┬─────┘
     │
     │ 2. POST /auth/login
     ▼
┌──────────────────┐
│  LoginForm.tsx   │ 3. Calls AuthService.login()
└────┬─────────────┘
     │
     │ 4. Sends credentials
     ▼
┌────────────────────┐
│ authService.ts     │ 5. Makes API request
└────┬───────────────┘
     │
     │ 6. HTTPS POST
     ▼
┌────────────────────────────┐
│  API Gateway               │ 7. Routes to Lambda
│  /auth/login               │
└────┬───────────────────────┘
     │
     │ 8. Invokes
     ▼
┌──────────────────────────────┐
│  auth_lambda_function.py     │ 9. Validates credentials
│                              │ 10. Queries DynamoDB
│  • Hash password             │ 11. Generates JWT token
│  • Query users table         │
│  • Verify hash               │
│  • Generate token            │
└────┬─────────────────────────┘
     │
     │ 12. Returns user + token
     ▼
┌────────────────────┐
│ AuthContext.tsx    │ 13. Stores token in localStorage
│                    │ 14. Updates user state
└────┬───────────────┘
     │
     │ 15. Redirects to app
     ▼
┌──────────┐
│  User    │ Now authenticated!
└──────────┘
```

### 2. AI Content Generation Flow

```
┌──────────┐
│ Teacher  │ 1. Clicks "Generate with AI"
└────┬─────┘
     │
     │ 2. User action
     ▼
┌────────────────────────────┐
│  TopicTabbedView.tsx       │ 3. Calls handleGenerateAI()
│                            │ 4. Extracts PDF text (if uploaded)
└────┬───────────────────────┘
     │
     │ 5. Calls secureGeminiService
     ▼
┌────────────────────────────┐
│  secureGeminiService.ts    │ 6. Prepares prompt
│                            │ 7. Includes document text
│  • Builds prompt           │
│  • Includes documents      │
│  • Sets parameters         │
└────┬───────────────────────┘
     │
     │ 8. POST /gemini/generate-content
     ▼
┌────────────────────────────┐
│  API Gateway               │ 9. Routes request
│  /gemini/generate-content  │
└────┬───────────────────────┘
     │
     │ 10. Invokes
     ▼
┌──────────────────────────────────┐
│  gemini_lambda_function.py       │ 11. Adds API key
│                                  │ 12. Calls Google Gemini
│  • Add API key to request        │
│  • Call Gemini API               │
│  • Handle rate limits            │
└────┬─────────────────────────────┘
     │
     │ 13. Gemini API request
     ▼
┌──────────────────────┐
│  Google Gemini API   │ 14. Generates AI content
│                      │ 15. Returns generated text
└────┬─────────────────┘
     │
     │ 16. Returns to Lambda
     ▼
┌──────────────────────────────────┐
│  gemini_lambda_function.py       │ 17. Formats response
└────┬─────────────────────────────┘
     │
     │ 18. Returns to frontend
     ▼
┌────────────────────────────┐
│  TopicTabbedView.tsx       │ 19. Displays AI content
│                            │ 20. Saves to DynamoDB
└────┬───────────────────────┘
     │
     │ 21. PUT /topics/{id}
     ▼
┌────────────────────────────┐
│  lambda_function.py        │ 22. Updates topic in DB
└────┬───────────────────────┘
     │
     │ 23. Saves to DynamoDB
     ▼
┌────────────────────────────┐
│  learning_assist_topics    │ 24. Topic updated with AI content
└────────────────────────────┘
```

### 3. Navigation Flow

```
┌──────────┐
│  User    │ 1. Opens app
└────┬─────┘
     │
     │ 2. Loads
     ▼
┌────────────────────────────┐
│  App.tsx                   │ 3. Renders based on currentPath
│  • currentPath = {}        │
└────┬───────────────────────┘
     │
     │ 4. currentPath.school is undefined
     ▼
┌────────────────────────────┐
│  SchoolList.tsx            │ 5. Shows all schools
└────┬───────────────────────┘
     │
     │ 6. User clicks "Lincoln Elementary"
     ▼
┌────────────────────────────┐
│  SchoolList.tsx            │ 7. Calls setCurrentPath({ school })
└────┬───────────────────────┘
     │
     │ 8. Updates AppContext
     ▼
┌────────────────────────────┐
│  App.tsx                   │ 9. Re-renders
│  • currentPath = { school }│ 10. school is set, class is undefined
└────┬───────────────────────┘
     │
     │ 11. Renders ClassList
     ▼
┌────────────────────────────┐
│  ClassList.tsx             │ 12. Shows classes for school
└────┬───────────────────────┘
     │
     │ 13. User clicks "Grade 6 - Section A"
     ▼
┌────────────────────────────┐
│  ClassList.tsx             │ 14. Calls setCurrentPath({ school, class })
└────┬───────────────────────┘
     │
     │ 15. Updates AppContext
     ▼
┌────────────────────────────┐
│  App.tsx                   │ 16. Re-renders
│  • currentPath = {         │ 17. school & class set, subject undefined
│      school, class         │
│    }                       │
└────┬───────────────────────┘
     │
     │ 18. Renders SubjectList
     ▼
┌────────────────────────────┐
│  SubjectList.tsx           │ 19. Shows subjects for class
└────┬───────────────────────┘
     │
     │ 20. User clicks "Science"
     ▼
┌────────────────────────────┐
│  SubjectList.tsx           │ 21. Calls setCurrentPath({ school, class, subject })
└────┬───────────────────────┘ 22. Triggers refreshTopics() to load from API
     │
     │ 23. Updates AppContext + loads topics from API
     ▼
┌────────────────────────────┐
│  AppContext.tsx            │ 24. Calls topicsAPI.getBySubject(subjectId)
└────┬───────────────────────┘
     │
     │ 25. GET /topics?subject_id={id}
     ▼
┌────────────────────────────┐
│  API Gateway               │ 26. Routes to Lambda
└────┬───────────────────────┘
     │
     │ 27. Invokes
     ▼
┌────────────────────────────┐
│  lambda_function.py        │ 28. Queries DynamoDB
└────┬───────────────────────┘
     │
     │ 29. Query by subject_id
     ▼
┌────────────────────────────┐
│  learning_assist_topics    │ 30. Returns matching topics
└────┬───────────────────────┘
     │
     │ 31. Returns to AppContext
     ▼
┌────────────────────────────┐
│  AppContext.tsx            │ 32. Updates subject.topics array
└────┬───────────────────────┘
     │
     │ 33. Re-renders
     ▼
┌────────────────────────────┐
│  App.tsx                   │ 34. Renders TopicList
│  • currentPath = {         │
│      school, class,        │
│      subject               │
│    }                       │
└────┬───────────────────────┘
     │
     │ 35. Renders TopicList
     ▼
┌────────────────────────────┐
│  TopicList.tsx             │ 36. Shows all topics for subject
└────────────────────────────┘
```

---

## Component Tree

```
App.tsx
├── ThemeProvider
│   └── AuthProvider
│       └── ProtectedRoute
│           └── AppProvider
│               └── AppContent
│                   ├── Header
│                   │   ├── SearchBar
│                   │   ├── ThemeToggle
│                   │   └── UserInfo
│                   │       ├── AdminButton
│                   │       ├── TrainingButton
│                   │       └── LogoutButton
│                   ├── Breadcrumb
│                   └── Main Content (conditional)
│                       ├── AdminDashboard
│                       │   └── AcademicRecordsManager
│                       ├── TeacherTraining
│                       ├── SchoolList
│                       ├── ClassList
│                       ├── SubjectList
│                       └── TopicList
│                           └── TopicTabbedView
│                               ├── Overview Tab
│                               ├── Lesson Plan Tab
│                               ├── Teaching Guide Tab
│                               ├── Group Discussion Tab
│                               ├── Assessment Tab
│                               ├── Worksheets Tab
│                               ├── Images Tab
│                               │   └── ImageDisplay
│                               └── Videos Tab
│                                   └── YouTubePlayer
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                           │
└─────────────────────────────────────────────────────────────┘

Layer 1: Frontend Authentication
┌─────────────────────────────────────────────────────────────┐
│  • JWT token stored in localStorage                          │
│  • Token sent with every API request                         │
│  • AuthContext checks authentication state                   │
│  • ProtectedRoute component blocks unauthenticated users     │
└─────────────────────────────────────────────────────────────┘

Layer 2: API Gateway
┌─────────────────────────────────────────────────────────────┐
│  • HTTPS only                                                │
│  • CORS configured                                           │
│  • Rate limiting (optional - not configured yet)             │
└─────────────────────────────────────────────────────────────┘

Layer 3: Lambda Function Validation
┌─────────────────────────────────────────────────────────────┐
│  • Verifies JWT token                                        │
│  • Checks user permissions                                   │
│  • Validates input data                                      │
│  • Sanitizes inputs                                          │
└─────────────────────────────────────────────────────────────┘

Layer 4: Database Access Control
┌─────────────────────────────────────────────────────────────┐
│  • IAM roles for Lambda functions                            │
│  • DynamoDB table permissions                                │
│  • Read/write access control                                 │
└─────────────────────────────────────────────────────────────┘

Layer 5: Password Security
┌─────────────────────────────────────────────────────────────┐
│  • PBKDF2 hashing with 100,000 iterations                    │
│  • Random salt per user                                      │
│  • Never store plaintext passwords                           │
└─────────────────────────────────────────────────────────────┘

Layer 6: API Key Protection
┌─────────────────────────────────────────────────────────────┐
│  • External API keys stored in Lambda env variables          │
│  • Never exposed in frontend code                            │
│  • Lambda proxy pattern for all external APIs                │
└─────────────────────────────────────────────────────────────┘
```

---

**Last Updated**: November 6, 2025

