# Xcode AI Prompt: Sprout AI Parent iOS App Generation

Create a comprehensive iOS app for "Sprout AI Parent Portal" - an educational app that allows parents to track their child's learning progress and access educational content. This is a native iOS app that replicates the functionality of an existing React PWA.

## App Overview
- **App Name**: Sprout AI Parent Portal
- **Bundle ID**: com.seedlinglabs.sproutai.parent
- **Target**: iOS 15.0+
- **Architecture**: SwiftUI + Combine
- **Design**: Modern, clean, educational-focused UI with warm color scheme

## Core Features & Screens

### 1. Authentication System
**Login Screen:**
- Phone number input (10 digits, numeric keypad)
- Password input (required, secure text entry)
- SeedlingLabs logo prominently displayed
- "Access Dashboard" button
- "Don't have an account? Register Here" link
- Loading states and error handling

**Registration Screen:**
- Full name (required)
- Email address (required)
- Phone number (required, 10 digits)
- Password (minimum 6 characters)
- Confirm password
- School selection dropdown
- Grade selection (1-12, multi-select grid)
- Section selection (A-F, multi-select grid)
- Class access preview showing selected combinations
- Form validation and error handling

### 2. Dashboard Screen
**Main Features:**
- Header with SeedlingLabs logo and user welcome
- User info display (name, school, classes)
- Logout button
- Subjects grid showing:
  - Subject name and class info
  - Progress bar (completed/total topics)
  - Completed topics accordion with:
    - Topic name and completion date
    - Expandable sections showing videos and quiz button
    - Video links that open in Safari
    - "Take Quiz" button for topics with assessments

**Data Flow:**
- Load academic records from API
- Fetch subject data from static data
- Combine to show progress and completed topics
- Real-time progress tracking

### 3. Quiz System
**Quiz Modal:**
- Full-screen modal overlay
- Progress bar showing question progress
- Question text with multiple choice options
- Previous/Next navigation
- Results screen with:
  - Score percentage and correct/total
  - Pass/fail indication (70% threshold)
  - Answer review showing correct/incorrect
  - "Try Again" and "Close" buttons

**Quiz Features:**
- Parse assessment questions from topic data
- Support for A-D multiple choice format
- Score calculation and results display
- Restart functionality

### 4. Video Integration
- Video links open in Safari (external YouTube videos)
- Video title and duration display
- Play button icons
- Responsive video list layout

## API Integration

### Authentication API
**Base URL**: `https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod`

**Endpoints:**
- `POST /auth/login` - Phone number login
- `POST /auth/register` - User registration
- `GET /auth/verify` - Token verification
- `POST /auth/logout` - User logout

**Request/Response Models:**
```swift
struct LoginRequest: Codable {
    let phoneNumber: String
    let password: String
    let name: String?
}

struct AuthResponse: Codable {
    let user: Parent
    let token: String
    let message: String
}

struct Parent: Codable {
    let userId: String
    let email: String
    let name: String
    let userType: String
    let classAccess: [String]
    let schoolId: String
    let phoneNumber: String?
    let isActive: Bool
    let createdAt: String
    let lastLogin: String?
}
```

### Topics API
**Base URL**: `https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod`

**Endpoints:**
- `GET /topics?subject_id={id}` - Get topics by subject
- `GET /topics/{id}` - Get specific topic details

**Models:**
```swift
struct Topic: Codable {
    let id: String
    let name: String
    let description: String?
    let subjectId: String
    let schoolId: String
    let classId: String
    let createdAt: String
    let updatedAt: String
    let aiContent: AIContent?
}

struct AIContent: Codable {
    let lessonPlan: String?
    let teachingGuide: String?
    let groupDiscussion: String?
    let assessmentQuestions: String?
    let worksheets: String?
    let videos: [Video]?
    let generatedAt: String?
    let classLevel: String?
}

struct Video: Codable {
    let title: String
    let url: String
    let duration: String?
}
```

### Academic Records API
**Base URL**: `https://a34mmmc1te.execute-api.us-west-2.amazonaws.com/pre-prod`

**Endpoints:**
- `GET /academic-records?school_id={id}&academic_year={year}&grade={grade}&section={section}` - Get academic records

**Models:**
```swift
struct AcademicRecord: Codable {
    let recordId: String
    let topicId: String
    let schoolId: String
    let academicYear: String
    let grade: String
    let section: String
    let subjectId: String
    let subjectName: String
    let topicName: String
    let teacherId: String?
    let teacherName: String?
    let status: String // "not_started", "in_progress", "completed", "on_hold", "cancelled"
    let notes: String?
    let createdAt: String
    let updatedAt: String
}
```

## Static Data Requirements

### School Data Structure
```swift
struct School: Codable {
    let id: String
    let name: String
    let description: String?
    let classes: [Class]
    let createdAt: Date
    let updatedAt: Date
}

struct Class: Codable {
    let id: String
    let name: String
    let description: String?
    let subjects: [Subject]
    let createdAt: Date
    let updatedAt: Date
}

struct Subject: Codable {
    let id: String
    let name: String
    let description: String?
    let topics: [Topic]
    let createdAt: Date
    let updatedAt: Date
}
```

**Required Schools Data:**
1. Content Development School
2. Sri Vidyaniketan Public School (CBSE)
3. Sri Vidyaniketan International School (ICSE)

## UI/UX Design Requirements

### Color Scheme
- **Primary**: #4d2917 (Dark Brown)
- **Secondary**: #daa429 (Golden Yellow)
- **Background**: Linear gradient from #4d2917 to #daa429
- **Cards**: White with 95% opacity, subtle shadows
- **Text**: #231120 (Dark text on light backgrounds)
- **Success**: #4caf50 (Green for completed items)
- **Error**: #dc2626 (Red for errors)

### Typography
- **Primary Font**: San Francisco (system font)
- **Headers**: Bold, 18-28px
- **Body**: Regular, 14-16px
- **Captions**: Regular, 12-14px

### Layout Principles
- **Mobile-first design**
- **Card-based interface**
- **Consistent spacing (8px, 16px, 24px)**
- **Rounded corners (12-16px radius)**
- **Subtle shadows and blur effects**
- **Responsive grid layouts**

### Key UI Components
1. **Loading Spinner**: Custom spinner with brand colors
2. **Progress Bars**: Animated progress indicators
3. **Accordion Views**: Expandable topic sections
4. **Modal Presentations**: Full-screen quiz modals
5. **Form Inputs**: Custom styled text fields and buttons
6. **Navigation**: Tab-based navigation with icons

## Technical Requirements

### Core Technologies
- **SwiftUI** for UI
- **Combine** for reactive programming
- **URLSession** for networking
- **UserDefaults** for local storage
- **SafariServices** for external video links

### Key Features
- **Offline Support**: Cache user data and academic records
- **Push Notifications**: For topic updates (future enhancement)
- **Biometric Authentication**: Face ID/Touch ID support
- **Dark Mode Support**: Adaptive color schemes
- **Accessibility**: VoiceOver support, dynamic type
- **Performance**: Lazy loading, image caching

### Data Management
- **Core Data** for local storage
- **Keychain** for secure token storage
- **Network Layer** with retry logic and error handling
- **State Management** using @StateObject and @ObservableObject

## Required Assets
- **SeedlingLabs Logo**: High-resolution PNG (80x80px minimum)
- **App Icons**: All required sizes (1024x1024, 180x180, 120x120, etc.)
- **Launch Screen**: Branded launch screen with logo

## Data Files to Include
You'll need to copy these data files from the React app:
1. `src/data/content-development-school.ts`
2. `src/data/sri-vidyaniketan-public-school-cbse.ts`
3. `src/data/sri-vidyaniketan-international-school-icse.ts`
4. `src/types/static.ts` (for type definitions)

Convert these TypeScript files to Swift structs and include them as static data in the iOS app.

## App Flow
1. **Launch** → Check authentication status
2. **Login/Register** → Authenticate user
3. **Dashboard** → Show subjects and progress
4. **Topic Details** → Expand to show videos and quiz
5. **Quiz** → Take assessment if available
6. **Video Links** → Open in Safari

## Error Handling
- Network connectivity issues
- Invalid credentials
- API rate limiting
- Data parsing errors
- Offline mode graceful degradation

## Performance Considerations
- Lazy loading of topic data
- Image caching for logos
- Efficient list rendering for large datasets
- Background API calls
- Memory management for video content

Create a production-ready iOS app with proper error handling, loading states, and a polished user experience that matches the React PWA functionality.
