# 🎓 Sprout AI Learning Assistant - Complete Onboarding Guide

**Welcome to the Sprout AI Learning Assistant project!** This comprehensive guide will help you understand the architecture, codebase, and development workflow.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Key Components Deep Dive](#key-components-deep-dive)
6. [Data Flow & State Management](#data-flow--state-management)
7. [Backend Services](#backend-services)
8. [Frontend Architecture](#frontend-architecture)
9. [Authentication & Authorization](#authentication--authorization)
10. [API Integration](#api-integration)
11. [Development Workflow](#development-workflow)
12. [Deployment Guide](#deployment-guide)
13. [Key Features](#key-features)
14. [Common Tasks](#common-tasks)
15. [Troubleshooting](#troubleshooting)
16. [Best Practices](#best-practices)

---

## 1. Project Overview

### What is Sprout AI Learning Assistant?

**Sprout AI** is an AI-powered learning management platform designed for K-12 education. It helps teachers create comprehensive learning materials using AI while providing a hierarchical navigation system for schools, classes, subjects, and topics.

### Main Goals

- **For Teachers**: AI-assisted content generation (lesson plans, assessments, worksheets, teaching guides)
- **For Students/Parents**: Easy access to learning materials organized by school hierarchy
- **For Admins**: Manage users, academic records, and system-wide settings

### User Types

1. **Teacher**: Full access to create/edit content, generate AI materials
2. **Parent**: Read-only access to classes their children are enrolled in
3. **Student**: Access learning materials for their classes
4. **Admin**: System administration, user management, academic records

---

## 2. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │  Learning  │  │    Parent    │  │    Admin Dashboard      │ │
│  │   Assist   │  │     App      │  │  (User & Record Mgmt)   │ │
│  └────────────┘  └──────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AWS API GATEWAY                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ /topics      │  │ /auth        │  │ /academic-records  │   │
│  │ /gemini      │  │              │  │                    │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS LAMBDA FUNCTIONS                        │
│  ┌──────────────────┐  ┌────────────────────┐  ┌─────────────┐│
│  │ Topics Lambda    │  │  Auth Lambda       │  │  Gemini     ││
│  │ (CRUD Topics)    │  │  (User Auth/JWT)   │  │  Proxy      ││
│  │                  │  │                    │  │  Lambda     ││
│  └──────────────────┘  └────────────────────┘  └─────────────┘│
│           │                      │                      │       │
└───────────┼──────────────────────┼──────────────────────┼───────┘
            │                      │                      │
            ▼                      ▼                      ▼
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐
│   DynamoDB      │    │   DynamoDB       │    │  Google Gemini │
│ learning_assist │    │ learning_assist  │    │      API       │
│    _topics      │    │    _users        │    │                │
└─────────────────┘    │                  │    └────────────────┘
                       │ academic_records │
                       └──────────────────┘
```

### Architecture Patterns

1. **Serverless**: AWS Lambda functions for scalability and cost-efficiency
2. **JAMstack**: Static frontend (React) + API backend
3. **Context API**: React state management (no Redux)
4. **RESTful APIs**: Standard HTTP methods for CRUD operations
5. **JWT Authentication**: Token-based auth with role-based access control

---

## 3. Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.1.1 | UI framework |
| **TypeScript** | 4.9.5 | Type safety |
| **Lucide React** | 0.544.0 | Icon library |
| **html2canvas** | 1.4.1 | Screenshot/PDF export |
| **jspdf** | 3.0.3 | PDF generation |
| **docx** | 9.5.1 | Word document generation |
| **pdfjs-dist** | 3.11.174 | PDF parsing |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.x | Lambda runtime |
| **AWS Lambda** | N/A | Serverless compute |
| **AWS API Gateway** | N/A | API management |
| **AWS DynamoDB** | N/A | NoSQL database |
| **boto3** | 1.34.0 | AWS SDK |
| **PyJWT** | 2.8.0 | JWT token handling |
| **PyPDF2** | 3.0.1 | Server-side PDF extraction |

### External APIs

| Service | Purpose |
|---------|---------|
| **Google Gemini** | AI content generation |
| **YouTube API** | Video search & metadata |
| **Unsplash API** | Educational images |
| **Pexels API** | Educational images |

---

## 4. Project Structure

```
learning-assist/
├── learning-assist/                    # Main learning assistant app
│   ├── backend/                        # AWS Lambda functions
│   │   ├── auth_lambda_function.py     # User authentication
│   │   ├── lambda_function.py          # Topics CRUD
│   │   ├── gemini_lambda_function.py   # AI proxy
│   │   ├── academic_records_lambda...  # Academic records API
│   │   ├── requirements.txt            # Python dependencies
│   │   ├── deploy-*.sh                 # Deployment scripts
│   │   └── boto3/                      # Bundled AWS SDK
│   │
│   ├── src/
│   │   ├── components/                 # React components
│   │   │   ├── SchoolList.tsx          # School navigation
│   │   │   ├── ClassList.tsx           # Class navigation
│   │   │   ├── SubjectList.tsx         # Subject navigation
│   │   │   ├── TopicList.tsx           # Topic listing
│   │   │   ├── TopicTabbedView.tsx     # Topic content display
│   │   │   ├── LoginForm.tsx           # Authentication UI
│   │   │   ├── AdminDashboard.tsx      # Admin panel
│   │   │   └── ...                     # Other UI components
│   │   │
│   │   ├── context/
│   │   │   ├── AppContext.tsx          # App state management
│   │   │   ├── AuthContext.tsx         # Authentication state
│   │   │   └── ThemeContext.tsx        # Theme (dark/light mode)
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts                  # Topics API client
│   │   │   ├── authService.ts          # Auth API client
│   │   │   ├── secureGeminiService.ts  # AI content generation
│   │   │   ├── youtubeService.ts       # YouTube integration
│   │   │   ├── imageSearchService.ts   # Image search
│   │   │   ├── pdfExtractorService.ts  # PDF text extraction
│   │   │   └── academicRecordsService  # Academic records
│   │   │
│   │   ├── types/
│   │   │   └── index.ts                # TypeScript interfaces
│   │   │
│   │   ├── data/
│   │   │   └── mockData.ts             # Initial school data
│   │   │
│   │   ├── styles/                     # CSS files
│   │   ├── utils/                      # Utility functions
│   │   ├── App.tsx                     # Main app component
│   │   └── index.tsx                   # React entry point
│   │
│   ├── public/                         # Static assets
│   ├── package.json                    # Frontend dependencies
│   ├── tsconfig.json                   # TypeScript config
│   └── README.md                       # Documentation
│
└── parent-app/                         # Simplified parent view app
    ├── src/
    │   ├── components/                 # Parent-specific components
    │   ├── services/                   # API services
    │   └── ...
    └── package.json
```

---

## 5. Key Components Deep Dive

### Frontend Components

#### Navigation Components

1. **`SchoolList.tsx`**
   - Entry point of the app
   - Displays all schools in the system
   - Filters schools based on user permissions
   - Shows school cards with descriptions

2. **`ClassList.tsx`**
   - Shows classes within a selected school
   - Example: "Grade 3 - Mathematics", "Grade 4 - Science"
   - Filters by parent/student access if applicable

3. **`SubjectList.tsx`**
   - Displays subjects for a selected class
   - Shows subject cards with descriptions
   - Allows teachers to add new subjects

4. **`TopicList.tsx`**
   - Shows all topics within a subject
   - Grid layout with topic cards
   - "Add Topic" button for teachers
   - Displays AI content generation status

#### Content Components

5. **`TopicTabbedView.tsx`** (Most Complex Component)
   - Main content display for a topic
   - **8 tabs**: 
     - Overview
     - Lesson Plan
     - Teaching Guide
     - Group Discussion
     - Assessment
     - Worksheets
     - Images
     - Videos
   - Handles AI content generation for all tabs
   - PDF/Word export functionality
   - YouTube video player integration
   - Image search and management

6. **`ChapterPlannerModal.tsx`**
   - AI-powered chapter planning tool
   - Uploads PDF textbooks
   - Analyzes content and generates topic breakdown
   - Creates multiple topics at once

7. **`AdminDashboard.tsx`**
   - User management (CRUD operations)
   - Academic records management
   - View all users by type
   - Edit user permissions

8. **`LoginForm.tsx`**
   - Email/password login for teachers
   - Phone-based login for parents
   - Registration for new teachers
   - Responsive design

#### Supporting Components

9. **`Breadcrumb.tsx`**: Navigation trail
10. **`SearchBar.tsx`**: Global search across all levels
11. **`ThemeToggle.tsx`**: Dark/light mode switcher
12. **`YouTubePlayer.tsx`**: Embedded video player modal
13. **`PDFUpload.tsx`**: PDF file upload and text extraction

---

## 6. Data Flow & State Management

### Context Architecture

The app uses **React Context API** for state management with three main contexts:

#### 1. **AuthContext** (`src/context/AuthContext.tsx`)

**Responsibilities:**
- User authentication state
- Login/logout/register operations
- JWT token management
- Role-based access control
- Class access validation

**Key State:**
```typescript
{
  user: User | null;              // Current logged-in user
  isAuthenticated: boolean;       // Auth status
  isLoading: boolean;             // Loading state
  error: string | null;           // Error messages
}
```

**Key Methods:**
```typescript
login(credentials)              // Login user
register(userData)              // Register new user
logout()                        // Logout user
hasRole(role)                   // Check user role
canAccessClass(classId)         // Check class access
```

#### 2. **AppContext** (`src/context/AppContext.tsx`)

**Responsibilities:**
- Navigation state (current school/class/subject/topic)
- Topic CRUD operations
- Search functionality
- AI content generation
- Model selection

**Key State:**
```typescript
{
  schools: School[];                    // All schools data
  currentPath: NavigationPath;          // Current location
  searchQuery: string;                  // Search input
  searchResults: SearchResult[];        // Search results
  loading: boolean;                     // Loading state
  error: string | null;                 // Errors
  selectedModel: string;                // AI model
}
```

**Key Methods:**
```typescript
setCurrentPath(path)                // Navigate
addTopic(subjectId, topic)          // Create topic
updateTopic(topicId, updates)       // Update topic
deleteTopic(topicId)                // Delete topic
performSearch(query)                // Search
discoverDocuments(request)          // AI document discovery
refreshTopics()                     // Reload topics
```

#### 3. **ThemeContext** (`src/context/ThemeContext.tsx`)

**Responsibilities:**
- Dark/light mode toggle
- Theme persistence in localStorage

---

## 7. Backend Services

### Lambda Function 1: **Topics API** (`lambda_function.py`)

**Purpose**: CRUD operations for learning topics

**DynamoDB Table**: `learning_assist_topics`

**Schema**:
```python
{
  "id": "topic-uuid",
  "name": "Topic Name",
  "description": "Description",
  "subject_id": "subject-123",
  "school_id": "school-456",
  "class_id": "class-789",
  "documentLinks": [...],
  "aiContent": {
    "lessonPlan": "...",
    "teachingGuide": "...",
    "assessmentQuestions": "...",
    "worksheets": "...",
    "images": [...],
    "videos": [...]
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Endpoints**:
- `GET /topics` - Get all topics
- `GET /topics?subject_id=<id>` - Get topics by subject
- `GET /topics/{id}` - Get specific topic
- `POST /topics` - Create new topic
- `PUT /topics/{id}` - Update topic
- `DELETE /topics/{id}` - Delete topic
- `POST /topics/extract-pdf` - Extract text from PDF

**Key Features**:
- Automatic table creation
- Server-side PDF extraction with PyPDF2
- Decimal number handling for DynamoDB
- Global Secondary Index on `subject_id`

### Lambda Function 2: **Auth API** (`auth_lambda_function.py`)

**Purpose**: User authentication and authorization

**DynamoDB Table**: `learning_assist_users`

**Schema**:
```python
{
  "user_id": "user-uuid",
  "email": "teacher@example.com",
  "password_hash": "hashed_password",
  "salt": "random_salt",
  "name": "Teacher Name",
  "user_type": "teacher",  # or "parent", "student", "admin"
  "school_id": "school-123",
  "class_access": ["class-1", "class-2"],  # For parents/students
  "phone_number": "1234567890",  # For parents
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Endpoints**:
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login (email/password or phone)
- `GET /auth/verify` - Verify JWT token
- `GET /auth/user/{id}` - Get user details
- `PUT /auth/user/{id}` - Update user
- `GET /auth/users?user_type=<type>` - List users by type

**Security Features**:
- PBKDF2 password hashing with 100,000 iterations
- Random salt generation
- JWT token with 7-day expiration
- Global Secondary Index on `email`
- Phone-based authentication for parents

### Lambda Function 3: **Gemini Proxy** (`gemini_lambda_function.py`)

**Purpose**: Secure proxy for Google Gemini API

**Why?**: Hide API keys from frontend, implement rate limiting

**Endpoints**:
- `POST /gemini/generate-content` - Generate AI content
- `POST /gemini/discover-documents` - Document discovery
- `POST /gemini/enhance-section` - Enhance text
- `POST /gemini/analyze-chapter` - Chapter analysis

**Models Supported**:
- `gemini-1.5-flash` (default) - Fast, cost-effective
- `gemini-1.5-pro` - More capable, higher quality
- `deepseek-chat` (via Gemini API) - Alternative model

### Lambda Function 4: **Academic Records API** (`academic_records_lambda_function.py`)

**Purpose**: Track topic completion status by class, teacher, parent

**DynamoDB Table**: `academic_records`

**Schema**:
```python
{
  "record_id": "school#2024-25#6#A#science",  # Composite key
  "topic_id": "topic-photosynthesis",
  "academic_year": "2024-25",
  "grade": "6",
  "section": "A",
  "subject_id": "science",
  "subject_name": "Science",
  "topic_name": "Photosynthesis",
  "teacher_id": "teacher-123",
  "teacher_name": "Mrs. Smith",
  "parent_phone": "9900509938",
  "parent_name": "Parent 001",
  "status": "in_progress",  # not_started, completed, on_hold, cancelled
  "start_date": "2024-09-01",
  "end_date": "2024-09-30",
  "notes": "Additional notes"
}
```

**Endpoints**:
- `POST /academic-records` - Create record
- `GET /academic-records/{record_id}/{topic_id}` - Get specific record
- `PUT /academic-records/{record_id}/{topic_id}` - Update record
- `DELETE /academic-records/{record_id}/{topic_id}` - Delete record
- `GET /academic-records?parent_phone=<phone>` - Query by parent
- `GET /academic-records?teacher_id=<id>` - Query by teacher
- `GET /academic-records?school_id=<id>` - Query by school

---

## 8. Frontend Architecture

### Data Models (`src/types/index.ts`)

```typescript
// Core data structure: School → Class → Subject → Topic

interface School {
  id: string;
  name: string;
  description?: string;
  classes: Class[];
  createdAt: Date;
  updatedAt: Date;
}

interface Class {
  id: string;
  name: string;
  description?: string;
  subjects: Subject[];
  createdAt: Date;
  updatedAt: Date;
}

interface Subject {
  id: string;
  name: string;
  description?: string;
  topics: Topic[];
  createdAt: Date;
  updatedAt: Date;
}

interface Topic {
  id: string;
  name: string;
  description?: string;
  documentLinks?: DocumentLink[];
  aiContent?: AIContent;
  createdAt: Date;
  updatedAt: Date;
  completionStatus?: 'completed' | 'in_progress' | 'not_started';
}

interface AIContent {
  lessonPlan?: string;
  teachingGuide?: string;
  groupDiscussion?: string;
  assessmentQuestions?: string;
  worksheets?: string;
  images?: EducationalImage[];
  videos?: YouTubeVideo[];
  generatedAt?: Date;
  classLevel?: string;
}
```

### Service Layer

#### `api.ts` - Topics API Client

```typescript
export const topicsAPI = {
  getAll(): Promise<Topic[]>
  getBySubject(subjectId: string): Promise<Topic[]>
  getById(id: string): Promise<Topic>
  create(topic: CreateTopicRequest): Promise<Topic>
  update(id: string, updates: Partial<Topic>): Promise<Topic>
  delete(id: string): Promise<void>
  extractPDF(pdfData: string): Promise<PDFExtractionResult>
}
```

#### `authService.ts` - Authentication

```typescript
export class AuthService {
  static async login(credentials: LoginRequest): Promise<AuthResponse>
  static async register(userData: RegisterRequest): Promise<AuthResponse>
  static async logout(): Promise<void>
  static async verifyToken(): Promise<VerificationResponse>
  static getCurrentUser(): User | null
  static getToken(): string | null
}
```

#### `secureGeminiService.ts` - AI Content Generation

```typescript
export const secureGeminiService = {
  generateContent(request: GenerateContentRequest): Promise<string>
  generateAssessment(topic, classLevel, documents?): Promise<string>
  generateLessonPlan(topic, classLevel, documents?): Promise<string>
  generateWorksheet(topic, classLevel, documents?): Promise<string>
  generateTeachingGuide(topic, classLevel, documents?): Promise<string>
  generateGroupDiscussion(topic, classLevel, documents?): Promise<string>
  discoverDocuments(request: DocumentDiscoveryRequest): Promise<...>
}
```

---

## 9. Authentication & Authorization

### Authentication Flow

1. **User Login**:
   ```
   User enters credentials
   → Frontend calls AuthService.login()
   → POST /auth/login to Lambda
   → Lambda validates credentials
   → Returns JWT token + user data
   → Frontend stores token in localStorage
   → AuthContext updates user state
   ```

2. **Token Verification**:
   ```
   App loads
   → AuthContext reads token from localStorage
   → Calls GET /auth/verify with token
   → Lambda validates token
   → Returns user data if valid
   → AuthContext sets authenticated state
   ```

3. **Protected Routes**:
   ```
   <ProtectedRoute> component checks isAuthenticated
   → If not authenticated, shows LoginForm
   → If authenticated, renders children components
   ```

### Role-Based Access Control (RBAC)

| Feature | Teacher | Parent | Student | Admin |
|---------|---------|--------|---------|-------|
| View all schools | ✅ | ❌ (only assigned) | ❌ (only assigned) | ✅ |
| Create topics | ✅ | ❌ | ❌ | ✅ |
| Edit topics | ✅ | ❌ | ❌ | ✅ |
| Delete topics | ✅ | ❌ | ❌ | ✅ |
| Generate AI content | ✅ | ❌ | ❌ | ✅ |
| View content | ✅ | ✅ | ✅ | ✅ |
| User management | ❌ | ❌ | ❌ | ✅ |
| Academic records | ❌ | ✅ (own children) | ❌ | ✅ |

### Implementation

```typescript
// In AppContext.tsx
const getFilteredSchools = (): School[] => {
  if (!user) return [];
  
  // Teachers can see everything
  if (hasRole('teacher')) {
    return schoolsData;
  }
  
  // Parents can only see classes their children are in
  if (hasRole('parent')) {
    const accessibleClassIds = user.class_access;
    return schoolsData.map(school => ({
      ...school,
      classes: school.classes.filter(cls => 
        accessibleClassIds.includes(cls.id)
      )
    })).filter(school => school.classes.length > 0);
  }
  
  // Similar logic for students
  return [];
};
```

---

## 10. API Integration

### Environment Variables

Frontend uses these environment variables (optional):

```bash
# .env.local (in learning-assist/ directory)
REACT_APP_YOUTUBE_API_KEY=your_youtube_api_key
REACT_APP_UNSPLASH_ACCESS_KEY=your_unsplash_key
REACT_APP_PEXELS_API_KEY=your_pexels_key
REACT_APP_GEMINI_API_KEY=your_gemini_key  # For direct calls (legacy)
```

**Note**: Most API calls go through the Lambda proxy, so frontend keys are optional.

### API Configuration

The API base URL is hardcoded in service files:

```typescript
// src/services/api.ts
const API_BASE_URL = 'https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod';
```

To change it, update all service files:
- `src/services/api.ts`
- `src/services/authService.ts`
- `src/services/secureGeminiService.ts`
- `src/services/academicRecordsService.ts`

### CORS Configuration

API Gateway has CORS enabled for all endpoints:

```bash
# Enable CORS on all routes
cd backend
./enable-cors.sh
./enable-cors-academic-records.sh
```

---

## 11. Development Workflow

### Setup Development Environment

1. **Clone Repository**:
   ```bash
   cd /path/to/your/projects
   # Already cloned as learning-assist
   ```

2. **Frontend Setup**:
   ```bash
   cd learning-assist/learning-assist
   npm install
   npm start
   ```
   App runs at `http://localhost:3000`

3. **Backend Setup** (only for deployment):
   ```bash
   cd learning-assist/learning-assist/backend
   # Deploy Lambda functions
   ./deploy-topics-only.sh
   ./deploy-auth-only.sh
   ./deploy-api-gateway.sh
   ```

### Development Process

1. **Feature Branch Workflow**:
   ```bash
   git checkout -b feature/your-feature-name
   # Make changes
   git add .
   git commit -m "Description of changes"
   git push origin feature/your-feature-name
   ```

2. **Testing Changes**:
   - Frontend: `npm start` and test in browser
   - Backend: Deploy to AWS and test with Postman/curl
   - Check browser console for errors
   - Use React DevTools for debugging

3. **Code Review & Merge**:
   - Create pull request
   - Review changes
   - Merge to main branch

### Hot Reload

React hot reload is enabled by default:
- Edit any `.tsx` file
- Browser automatically refreshes
- State is preserved when possible

---

## 12. Deployment Guide

### Frontend Deployment

#### Option 1: AWS S3 (Production)

```bash
cd learning-assist/learning-assist
./deploy-frontend.sh
```

**Output**: 
- S3 Bucket: `aischool.seedlinglabs.com`
- URL: `http://aischool.seedlinglabs.com.s3-website-us-west-2.amazonaws.com`

#### Option 2: AWS S3 (Development)

```bash
cd learning-assist/learning-assist
./deploy-frontend-dev.sh
```

**Output**:
- S3 Bucket: `aischool.dev.seedlinglabs.com`
- URL: `http://aischool.dev.seedlinglabs.com.s3-website-us-west-2.amazonaws.com`

### Backend Deployment

#### Deploy All Components

```bash
cd learning-assist/learning-assist/backend

# Deploy topics Lambda
./deploy-topics-only.sh

# Deploy auth Lambda
./deploy-auth-only.sh

# Deploy Gemini proxy Lambda
./deploy-gemini-proxy.sh

# Deploy academic records Lambda
./deploy-academic-records.sh

# Setup API Gateway routes
./deploy-api-gateway.sh

# Enable CORS
./enable-cors.sh
./enable-cors-academic-records.sh
```

#### Verify Deployment

```bash
cd backend
./check-status.sh
```

This will test all endpoints and show their status.

### Deployment Checklist

- [ ] Backend Lambda functions deployed
- [ ] API Gateway routes configured
- [ ] CORS enabled on all routes
- [ ] DynamoDB tables created (auto-created on first request)
- [ ] Frontend built (`npm run build`)
- [ ] Frontend deployed to S3
- [ ] Test login functionality
- [ ] Test topic creation
- [ ] Test AI content generation

---

## 13. Key Features

### 1. **Hierarchical Navigation**

**Flow**: Schools → Classes → Subjects → Topics

**Implementation**:
- `NavigationPath` in AppContext tracks current location
- `Breadcrumb` component shows current path
- Click breadcrumb to navigate back

### 2. **AI Content Generation**

**Tabs**:
- **Lesson Plan**: Comprehensive teaching plan
- **Teaching Guide**: Step-by-step instructions
- **Group Discussion**: Discussion questions
- **Assessment**: Quiz questions with answers
- **Worksheets**: Practice exercises

**Process**:
1. Teacher uploads PDF documents (optional)
2. Clicks "Generate with AI" button
3. Frontend extracts text from PDF
4. Calls Gemini API via Lambda proxy
5. AI generates content based on topic + documents
6. Content displayed and saved to DynamoDB

### 3. **Document Discovery**

**Feature**: AI analyzes documents and suggests related resources

**Flow**:
1. Teacher enters search query (e.g., "photosynthesis videos")
2. Clicks "Discover Documents"
3. AI searches and returns relevant:
   - PDFs
   - Videos
   - Websites
   - Books
4. Teacher reviews and adds to topic

### 4. **Chapter Planner**

**Feature**: AI-powered topic breakdown from textbook

**Flow**:
1. Teacher uploads PDF textbook
2. AI analyzes chapters and sections
3. Generates list of topics with:
   - Topic name
   - Description
   - Suggested duration
4. Teacher reviews and creates all topics at once

### 5. **YouTube Integration**

**Features**:
- Search YouTube videos by topic
- Embedded player with privacy mode
- Uses `youtube-nocookie.com` domain
- Filters out non-YouTube videos

**Implementation**:
```typescript
// src/services/youtubeService.ts
export const youtubeService = {
  searchVideos(query: string, maxResults: number = 5)
  getVideoDetails(videoId: string)
}
```

### 6. **Image Search**

**Features**:
- Search Unsplash and Pexels APIs
- Educational, kid-safe content filter
- High-quality images for lessons

**Implementation**:
```typescript
// src/services/imageSearchService.ts
export const imageSearchService = {
  searchUnsplashImages(query: string)
  searchPexelsImages(query: string)
}
```

### 7. **PDF/Word Export**

**Features**:
- Export assessments to PDF/Word
- Export worksheets to PDF/Word
- Professional formatting
- Auto-download

**Implementation**:
```typescript
// src/utils/exportHelpers.ts
export async function exportToPDF(content: string, filename: string)
export async function exportToWord(content: string, filename: string)
```

### 8. **Admin Dashboard**

**Features**:
- View all users by type
- Create new users
- Edit user permissions
- Manage class access
- View academic records

**Access**: Only users with `user_type: 'admin'`

### 9. **Dark Mode**

**Features**:
- Toggle dark/light theme
- Persistent across sessions
- Affects all components

**Implementation**: ThemeContext with CSS variables

### 10. **Search Functionality**

**Features**:
- Global search across all levels
- Searches: schools, classes, subjects, topics
- Shows full path for results
- Click result to navigate

**Implementation**:
```typescript
// In AppContext.tsx
const performSearch = (query: string): SearchResult[] => {
  // Search logic across all schools/classes/subjects/topics
}
```

---

## 14. Common Tasks

### Task 1: Add a New Component

1. Create component file:
   ```bash
   cd learning-assist/src/components
   touch MyNewComponent.tsx
   ```

2. Write component:
   ```typescript
   import React from 'react';
   
   interface MyNewComponentProps {
     title: string;
   }
   
   const MyNewComponent: React.FC<MyNewComponentProps> = ({ title }) => {
     return (
       <div className="my-new-component">
         <h2>{title}</h2>
       </div>
     );
   };
   
   export default MyNewComponent;
   ```

3. Import and use:
   ```typescript
   // In another component
   import MyNewComponent from './components/MyNewComponent';
   
   <MyNewComponent title="Hello" />
   ```

### Task 2: Add a New API Endpoint

1. **Update Lambda function**:
   ```python
   # In backend/lambda_function.py
   
   def lambda_handler(event, context):
       path = event.get('path', '')
       
       if path == '/topics/my-new-endpoint':
           # Handle new endpoint
           return {
               'statusCode': 200,
               'body': json.dumps({'message': 'Success'})
           }
   ```

2. **Deploy Lambda**:
   ```bash
   cd backend
   ./deploy-topics-only.sh
   ```

3. **Add route in API Gateway** (if needed):
   - Go to AWS Console → API Gateway
   - Create new resource/method
   - Link to Lambda function
   - Deploy to stage

4. **Add frontend service method**:
   ```typescript
   // In src/services/api.ts
   
   export const topicsAPI = {
     // ... existing methods
     
     myNewMethod: async (): Promise<any> => {
       const response = await fetch(`${API_BASE_URL}/topics/my-new-endpoint`, {
         method: 'GET',
         headers: {
           'Content-Type': 'application/json',
         },
       });
       
       if (!response.ok) {
         throw new Error('API call failed');
       }
       
       return await response.json();
     }
   };
   ```

### Task 3: Add a New Field to Topic

1. **Update TypeScript interface**:
   ```typescript
   // In src/types/index.ts
   
   export interface Topic {
     id: string;
     name: string;
     description?: string;
     myNewField?: string;  // Add this
     // ... other fields
   }
   ```

2. **Update components** that use the field:
   ```typescript
   // In TopicList.tsx or TopicTabbedView.tsx
   
   <div>{topic.myNewField}</div>
   ```

3. **Update backend** to store the field:
   ```python
   # In backend/lambda_function.py
   
   # DynamoDB will automatically store new fields
   # No schema change needed!
   ```

### Task 4: Add a New AI Content Type

1. **Update AIContent interface**:
   ```typescript
   // In src/types/index.ts
   
   export interface AIContent {
     lessonPlan?: string;
     teachingGuide?: string;
     myNewContent?: string;  // Add this
     // ... other fields
   }
   ```

2. **Add generation function**:
   ```typescript
   // In src/services/secureGeminiService.ts
   
   generateMyNewContent: async (
     topicName: string,
     classLevel: string,
     documents?: string[]
   ): Promise<string> => {
     const prompt = `Generate my new content for ${topicName}...`;
     
     return await secureGeminiService.generateContent({
       contents: [{ role: 'user', parts: [{ text: prompt }] }],
       generationConfig: {
         temperature: 0.7,
         maxOutputTokens: 2000,
       },
     });
   }
   ```

3. **Add tab in TopicTabbedView**:
   ```typescript
   // In src/components/TopicTabbedView.tsx
   
   const tabs = [
     'Overview',
     'Lesson Plan',
     'My New Content',  // Add this
     // ... other tabs
   ];
   
   // Add case in renderTabContent():
   case 'My New Content':
     return <MyNewContentDisplay content={topic.aiContent?.myNewContent} />;
   ```

### Task 5: Debug an Issue

1. **Check browser console**:
   - Press F12 in browser
   - Look for red error messages
   - Check Network tab for failed API calls

2. **Check Lambda logs**:
   ```bash
   # Get logs for topics Lambda
   aws logs tail /aws/lambda/learning-assist-topics --follow
   
   # Get logs for auth Lambda
   aws logs tail /aws/lambda/learning-assist-auth --follow
   ```

3. **Enable debug logging**:
   ```typescript
   // Add console.log statements
   console.log('DEBUG: topic data', topic);
   console.log('DEBUG: API response', response);
   ```

4. **Test API endpoint directly**:
   ```bash
   # Test topics endpoint
   curl https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics
   
   # Test with auth token
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/auth/verify
   ```

---

## 15. Troubleshooting

### Common Issues

#### Issue 1: "Cannot read property 'map' of undefined"

**Cause**: Data not loaded yet, component trying to render array that's undefined

**Solution**:
```typescript
// Add conditional rendering
{topics && topics.map(topic => (
  <TopicCard key={topic.id} topic={topic} />
))}

// Or use optional chaining
{topics?.map(topic => (
  <TopicCard key={topic.id} topic={topic} />
))}
```

#### Issue 2: CORS errors

**Symptoms**: 
- "No 'Access-Control-Allow-Origin' header"
- API calls fail in browser (but work in Postman)

**Solution**:
```bash
cd backend
./enable-cors.sh
./enable-cors-academic-records.sh

# Verify CORS is enabled
aws apigateway get-method \
  --rest-api-id xvq11x0421 \
  --resource-id RESOURCE_ID \
  --http-method OPTIONS
```

#### Issue 3: "Token expired" or "Invalid token"

**Cause**: JWT token expired (7-day validity)

**Solution**:
1. Logout and login again
2. Or extend token expiration in Lambda:
   ```python
   # In backend/auth_lambda_function.py
   'exp': (datetime.utcnow() + timedelta(days=30))  # 30 days
   ```

#### Issue 4: DynamoDB table not found

**Cause**: Lambda hasn't run yet to create table

**Solution**:
- Make any API call (e.g., GET /topics)
- Lambda will auto-create table on first request
- Wait 30 seconds for table to become active

#### Issue 5: "Failed to fetch" or network errors

**Possible Causes**:
1. **Lambda function not deployed**:
   ```bash
   aws lambda get-function --function-name learning-assist-topics
   ```

2. **API Gateway not configured**:
   ```bash
   aws apigateway get-rest-apis
   ```

3. **Incorrect API base URL**:
   - Check `src/services/api.ts`
   - Verify API Gateway URL

4. **Lambda timeout**:
   - Increase timeout in AWS Console
   - Lambda → Configuration → General → Timeout (default 3s, increase to 30s)

#### Issue 6: AI content not generating

**Possible Causes**:
1. **Gemini API key not set** in Lambda environment variables
2. **Rate limit exceeded** on Gemini API
3. **Lambda timeout** (increase timeout)
4. **Invalid prompt** (check Lambda logs)

**Solution**:
```bash
# Check Lambda environment variables
aws lambda get-function-configuration \
  --function-name learning-assist-gemini-proxy

# Check logs
aws logs tail /aws/lambda/learning-assist-gemini-proxy --follow
```

#### Issue 7: PDF extraction fails

**Possible Causes**:
1. **PyPDF2 not installed** in Lambda
2. **PDF is scanned images** (no searchable text)
3. **PDF is password-protected**
4. **PDF is too large** (Lambda memory limit)

**Solution**:
- Check if PDF has searchable text (try copying text)
- Use OCR tool if PDF is scanned images
- Remove password protection
- Split large PDFs into smaller files

---

## 16. Best Practices

### React Components

1. **Use TypeScript**: Always define prop interfaces
   ```typescript
   interface MyComponentProps {
     title: string;
     onSave: () => void;
   }
   ```

2. **Functional Components**: Prefer functional components over class components
   ```typescript
   const MyComponent: React.FC<MyComponentProps> = ({ title, onSave }) => {
     // ...
   };
   ```

3. **Use Hooks**: useState, useEffect, useContext
   ```typescript
   const [count, setCount] = useState<number>(0);
   const { user } = useAuth();
   ```

4. **Memoization**: Use React.memo for expensive components
   ```typescript
   const ExpensiveComponent = React.memo(({ data }) => {
     // Heavy rendering logic
   });
   ```

### State Management

1. **Context for Global State**: Use Context API for app-wide state
2. **Local State for UI**: Use useState for component-specific state
3. **Lift State Up**: Move state to common ancestor when needed
4. **Avoid Prop Drilling**: Use Context instead of passing props through many levels

### API Calls

1. **Error Handling**: Always wrap API calls in try-catch
   ```typescript
   try {
     const result = await topicsAPI.create(topic);
   } catch (error) {
     console.error('Failed to create topic:', error);
     setError(error.message);
   }
   ```

2. **Loading States**: Show loading indicators during API calls
   ```typescript
   const [loading, setLoading] = useState(false);
   
   const fetchData = async () => {
     setLoading(true);
     try {
       const data = await api.getData();
       setData(data);
     } finally {
       setLoading(false);
     }
   };
   ```

3. **Debounce Search**: Avoid excessive API calls
   ```typescript
   const debouncedSearch = useCallback(
     debounce((query) => performSearch(query), 300),
     []
   );
   ```

### Security

1. **Never expose API keys** in frontend code
2. **Use Lambda proxy** for external API calls
3. **Validate user permissions** before showing UI elements
4. **Sanitize user input** before displaying
5. **Use HTTPS** for all API calls

### Performance

1. **Code Splitting**: Split large bundles
   ```typescript
   const LazyComponent = React.lazy(() => import('./LazyComponent'));
   ```

2. **Optimize Images**: Compress images before upload
3. **Pagination**: Load data in chunks for large lists
4. **Caching**: Cache API responses when appropriate
5. **Bundle Analysis**: Check bundle size regularly

### Lambda Functions

1. **Keep functions small**: Single responsibility principle
2. **Use environment variables**: Don't hardcode secrets
3. **Log everything**: Use print() for debugging
4. **Handle errors gracefully**: Return proper HTTP status codes
5. **Set appropriate timeouts**: 30s for API calls, 300s for long processes

### DynamoDB

1. **Use composite keys**: For efficient querying
2. **Create GSIs**: For alternate query patterns
3. **Batch operations**: For bulk writes
4. **Use pagination**: For large result sets
5. **Monitor capacity**: Watch for throttling

---

## 17. Useful Commands

### Frontend

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Check for type errors
npx tsc --noEmit
```

### Backend

```bash
# Deploy all Lambda functions
cd backend
./deploy-topics-only.sh
./deploy-auth-only.sh
./deploy-gemini-proxy.sh

# Check deployment status
./check-status.sh

# View Lambda logs
aws logs tail /aws/lambda/learning-assist-topics --follow

# Invoke Lambda directly
aws lambda invoke \
  --function-name learning-assist-topics \
  --payload '{"httpMethod":"GET","path":"/topics"}' \
  response.json

# Update Lambda code only
zip -r function.zip lambda_function.py boto3/
aws lambda update-function-code \
  --function-name learning-assist-topics \
  --zip-file fileb://function.zip
```

### AWS CLI

```bash
# List S3 buckets
aws s3 ls

# List Lambda functions
aws lambda list-functions

# List DynamoDB tables
aws dynamodb list-tables

# Describe API Gateway
aws apigateway get-rest-apis

# Get DynamoDB table info
aws dynamodb describe-table --table-name learning_assist_topics
```

### Git

```bash
# Create feature branch
git checkout -b feature/my-feature

# Stage changes
git add .

# Commit
git commit -m "Add new feature"

# Push to remote
git push origin feature/my-feature

# Pull latest changes
git pull origin main

# View commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1
```

---

## 18. Resources & Links

### Official Documentation

- **React**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **AWS Lambda**: https://docs.aws.amazon.com/lambda/
- **DynamoDB**: https://docs.aws.amazon.com/dynamodb/
- **API Gateway**: https://docs.aws.amazon.com/apigateway/
- **Gemini API**: https://ai.google.dev/docs

### Project Documentation

- `learning-assist/README.md` - Main app overview
- `learning-assist/backend/README.md` - Backend deployment guide
- `learning-assist/DEPLOYMENT.md` - Full deployment guide
- `learning-assist/API_ENDPOINTS.md` - API reference
- `learning-assist/FEATURES_IMPLEMENTED.md` - Feature list
- `learning-assist/backend/ACADEMIC_RECORDS_API.md` - Academic records API

### Deployment URLs

- **Production Frontend**: http://aischool.seedlinglabs.com.s3-website-us-west-2.amazonaws.com
- **Dev Frontend**: http://aischool.dev.seedlinglabs.com.s3-website-us-west-2.amazonaws.com
- **API Gateway**: https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod

### AWS Console Links

- **Lambda Functions**: https://console.aws.amazon.com/lambda/home?region=us-west-2#/functions
- **DynamoDB Tables**: https://console.aws.amazon.com/dynamodb/home?region=us-west-2#tables:
- **API Gateway**: https://console.aws.amazon.com/apigateway/main/apis?region=us-west-2
- **S3 Buckets**: https://s3.console.aws.amazon.com/s3/buckets?region=us-west-2

---

## 19. Next Steps

Now that you understand the project, here are suggested next steps:

### Week 1: Familiarization

- [ ] Run the app locally (`npm start`)
- [ ] Test login with demo accounts
- [ ] Navigate through School → Class → Subject → Topic
- [ ] Create a test topic
- [ ] Generate AI content for a topic
- [ ] Review all tabs in TopicTabbedView
- [ ] Test search functionality
- [ ] Toggle dark mode

### Week 2: Code Exploration

- [ ] Read `App.tsx` and understand component tree
- [ ] Review `AppContext.tsx` and state management
- [ ] Examine `TopicTabbedView.tsx` (most complex component)
- [ ] Study service files (`api.ts`, `authService.ts`, etc.)
- [ ] Read Lambda function code
- [ ] Understand DynamoDB schema

### Week 3: Make Changes

- [ ] Fix a small bug or add a minor feature
- [ ] Deploy your changes to dev environment
- [ ] Test thoroughly
- [ ] Review code with team
- [ ] Deploy to production

### Week 4: Deep Dive

- [ ] Understand AI content generation flow
- [ ] Learn API Gateway configuration
- [ ] Study authentication/authorization
- [ ] Optimize performance
- [ ] Add monitoring and logging

---

## 20. Conclusion

You now have a comprehensive understanding of the **Sprout AI Learning Assistant** project. This guide covered:

✅ **Architecture**: Serverless AWS stack with React frontend  
✅ **Codebase**: Component structure, services, contexts  
✅ **Backend**: Lambda functions, DynamoDB, API Gateway  
✅ **Frontend**: React components, hooks, Context API  
✅ **Features**: AI content generation, navigation, search  
✅ **Deployment**: AWS S3, Lambda, automation scripts  
✅ **Development**: Best practices, debugging, common tasks  

### Key Takeaways

1. **Hierarchical Data Model**: School → Class → Subject → Topic
2. **Context API**: Three main contexts (Auth, App, Theme)
3. **Serverless Backend**: AWS Lambda + DynamoDB + API Gateway
4. **AI Integration**: Gemini API via secure Lambda proxy
5. **Role-Based Access**: Teachers, parents, students, admins
6. **Modern React**: Functional components, hooks, TypeScript

### Getting Help

- **Check documentation**: Project has extensive docs
- **Read error messages**: Console and Lambda logs are very helpful
- **Search codebase**: Use VS Code's search (Ctrl+Shift+F)
- **AWS documentation**: Official AWS docs are comprehensive
- **Team collaboration**: Don't hesitate to ask questions

---

**Happy Coding! 🚀**

---

*Last Updated: November 6, 2025*  
*Version: 1.0*

