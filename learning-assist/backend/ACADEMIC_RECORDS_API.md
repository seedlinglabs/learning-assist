# Academic Records Management API

A comprehensive Lambda-based service to manage academic data mappings including academic years, grades, sections, subjects, topics, teachers, status tracking, and parent associations.

## Table of Contents
- [Overview](#overview)
- [DynamoDB Schema](#dynamodb-schema)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Deployment](#deployment)
- [Usage Examples](#usage-examples)

## Overview

This service manages the mapping between:
- **Academic Year**: 2024-25, 2025-26, 2026-27, etc.
- **Grade**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, etc.
- **Section**: A, B, C, D, etc.
- **Subject**: Subject ID and name
- **Topic**: Topic ID and name
- **Teacher**: Teacher ID and name
- **Status**: not_started, in_progress, completed, on_hold, cancelled
- **Parent**: Phone number and name

## DynamoDB Schema

### Table: `academic_records`

#### Primary Keys
- **Partition Key**: `record_id` (String)
  - Format: `{school_id}#{academic_year}#{grade}#{section}#{subject_id}`
  - Example: `content-development-school#2024-25#6#A#science`
- **Sort Key**: `topic_id` (String)

#### Global Secondary Indexes (GSIs)

1. **parent_phone-index**
   - Partition Key: `parent_phone`
   - Sort Key: `topic_id`
   - Use: Query all records for a specific parent

2. **teacher_id-index**
   - Partition Key: `teacher_id`
   - Sort Key: `topic_id`
   - Use: Query all records for a specific teacher

3. **school_id-index**
   - Partition Key: `school_id`
   - Sort Key: `record_id`
   - Use: Query all records for a specific school

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| record_id | String | Composite primary key |
| topic_id | String | Sort key |
| school_id | String | School identifier |
| academic_year | String | e.g., "2024-25" |
| grade | String | e.g., "6" |
| section | String | e.g., "A" |
| subject_id | String | Subject identifier |
| subject_name | String | Subject display name |
| topic_name | String | Topic display name |
| teacher_id | String | Teacher identifier |
| teacher_name | String | Teacher display name |
| parent_phone | String | Parent's phone number |
| parent_name | String | Parent's name |
| status | String | not_started, in_progress, completed, on_hold, cancelled |
| start_date | String | ISO date string (optional) |
| end_date | String | ISO date string (optional) |
| notes | String | Additional notes (optional) |
| created_at | String | ISO timestamp |
| updated_at | String | ISO timestamp |

## API Endpoints

### 1. Create Academic Record

Create a new academic record.

**Endpoint**: `POST /academic-records`

**Request Body**:
```json
{
  "school_id": "content-development-school",
  "academic_year": "2024-25",
  "grade": "6",
  "section": "A",
  "subject_id": "science",
  "subject_name": "Science",
  "topic_id": "topic-photosynthesis",
  "topic_name": "Photosynthesis",
  "teacher_id": "teacher-123",
  "teacher_name": "Mrs. Smith",
  "parent_phone": "9900509938",
  "parent_name": "Parent 001",
  "status": "in_progress",
  "start_date": "2024-09-01",
  "end_date": "2024-09-30",
  "notes": "Started with basic concepts"
}
```

**Response**: `201 Created`
```json
{
  "record_id": "content-development-school#2024-25#6#A#science",
  "topic_id": "topic-photosynthesis",
  "school_id": "content-development-school",
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
  "status": "in_progress",
  "start_date": "2024-09-01",
  "end_date": "2024-09-30",
  "notes": "Started with basic concepts",
  "created_at": "2024-09-29T12:00:00.000Z",
  "updated_at": "2024-09-29T12:00:00.000Z"
}
```

### 2. Get Specific Record

Get a specific academic record.

**Endpoint**: `GET /academic-records/{record_id}/{topic_id}`

**Example**: `GET /academic-records/content-development-school%232024-25%236%23A%23science/topic-photosynthesis`

**Response**: `200 OK`
```json
{
  "record_id": "content-development-school#2024-25#6#A#science",
  "topic_id": "topic-photosynthesis",
  ...
}
```

### 3. Update Record

Update an existing academic record.

**Endpoint**: `PUT /academic-records/{record_id}/{topic_id}`

**Request Body** (only include fields to update):
```json
{
  "status": "completed",
  "end_date": "2024-09-25",
  "notes": "Topic completed successfully"
}
```

**Response**: `200 OK`
```json
{
  "record_id": "content-development-school#2024-25#6#A#science",
  "topic_id": "topic-photosynthesis",
  "status": "completed",
  "updated_at": "2024-09-25T12:00:00.000Z",
  ...
}
```

### 4. Delete Record

Delete an academic record.

**Endpoint**: `DELETE /academic-records/{record_id}/{topic_id}`

**Response**: `200 OK`
```json
{
  "message": "Record deleted successfully"
}
```

### 5. Query by Parent Phone

Get all records for a parent.

**Endpoint**: `GET /academic-records?parent_phone=9900509938`

**Response**: `200 OK`
```json
[
  {
    "record_id": "content-development-school#2024-25#6#A#science",
    "topic_id": "topic-photosynthesis",
    ...
  },
  {
    "record_id": "content-development-school#2024-25#6#A#mathematics",
    "topic_id": "topic-algebra",
    ...
  }
]
```

### 6. Query by Teacher ID

Get all records for a teacher.

**Endpoint**: `GET /academic-records?teacher_id=teacher-123`

**Response**: `200 OK`
```json
[
  {
    "record_id": "content-development-school#2024-25#6#A#science",
    "topic_id": "topic-photosynthesis",
    ...
  }
]
```

### 7. Query by School ID

Get all records for a school.

**Endpoint**: `GET /academic-records?school_id=content-development-school`

**Response**: `200 OK`
```json
[
  {
    "record_id": "content-development-school#2024-25#6#A#science",
    "topic_id": "topic-photosynthesis",
    ...
  }
]
```

### 8. Query by Class

Get all records for a specific class (school + academic year + grade + section).

**Endpoint**: `GET /academic-records?school_id=content-development-school&academic_year=2024-25&grade=6&section=A`

**Response**: `200 OK`
```json
[
  {
    "record_id": "content-development-school#2024-25#6#A#science",
    "topic_id": "topic-photosynthesis",
    ...
  },
  {
    "record_id": "content-development-school#2024-25#6#A#mathematics",
    "topic_id": "topic-algebra",
    ...
  }
]
```

## Data Models

### Status Values

Valid status values:
- `not_started`: Topic not yet started
- `in_progress`: Currently teaching/learning
- `completed`: Topic completed
- `on_hold`: Temporarily paused
- `cancelled`: Cancelled/skipped

### Record ID Format

The `record_id` is a composite key format:
```
{school_id}#{academic_year}#{grade}#{section}#{subject_id}
```

Examples:
- `content-development-school#2024-25#6#A#science`
- `sri-vidyaniketan-public-school-cbse#2025-26#7#B#mathematics`

This allows efficient querying by class and subject combinations.

## Deployment

### Prerequisites
- AWS CLI configured with appropriate credentials
- IAM permissions for Lambda, DynamoDB, and IAM role creation

### Deploy Lambda Function

```bash
cd backend
./deploy-academic-records.sh
```

This will:
1. Create a deployment package
2. Create or update the Lambda function
3. Create necessary IAM roles and policies
4. Grant DynamoDB permissions

### Set Up API Gateway

After deploying the Lambda:

1. Create a REST API in API Gateway
2. Create the following resources:
   - `/academic-records`
   - `/academic-records/{record_id}/{topic_id}`
3. Create methods (GET, POST, PUT, DELETE) with Lambda proxy integration
4. Enable CORS
5. Deploy to a stage (e.g., `pre-prod`)

### Table Creation

The DynamoDB table is automatically created on the first Lambda invocation. The Lambda includes table creation logic that:
- Checks if the table exists
- Creates the table with appropriate schema if it doesn't exist
- Waits for the table to become active

## Usage Examples

### Example 1: Track Topic Progress for a Class

```javascript
// Create record for Grade 6A Science - Photosynthesis
POST /academic-records
{
  "school_id": "content-development-school",
  "academic_year": "2024-25",
  "grade": "6",
  "section": "A",
  "subject_id": "science",
  "subject_name": "Science",
  "topic_id": "topic-photosynthesis",
  "topic_name": "Photosynthesis",
  "teacher_id": "teacher-123",
  "teacher_name": "Mrs. Smith",
  "status": "not_started",
  "start_date": "2024-10-01"
}

// Update when started
PUT /academic-records/{record_id}/topic-photosynthesis
{
  "status": "in_progress",
  "start_date": "2024-10-01"
}

// Mark as completed
PUT /academic-records/{record_id}/topic-photosynthesis
{
  "status": "completed",
  "end_date": "2024-10-15"
}
```

### Example 2: Parent Tracking Child's Progress

```javascript
// Parent logs in with phone 9900509938
// Get all topics for their child
GET /academic-records?parent_phone=9900509938

// Response shows all topics across all subjects
[
  {
    "subject_name": "Science",
    "topic_name": "Photosynthesis",
    "status": "completed",
    "teacher_name": "Mrs. Smith"
  },
  {
    "subject_name": "Mathematics",
    "topic_name": "Algebra",
    "status": "in_progress",
    "teacher_name": "Mr. Johnson"
  }
]
```

### Example 3: Teacher Dashboard

```javascript
// Teacher views all their assigned topics
GET /academic-records?teacher_id=teacher-123

// Response shows all topics across all classes they teach
[
  {
    "grade": "6",
    "section": "A",
    "subject_name": "Science",
    "topic_name": "Photosynthesis",
    "status": "completed"
  },
  {
    "grade": "7",
    "section": "B",
    "subject_name": "Science",
    "topic_name": "Cell Structure",
    "status": "in_progress"
  }
]
```

### Example 4: School Administration

```javascript
// Get all records for the school
GET /academic-records?school_id=content-development-school

// Get specific class data
GET /academic-records?school_id=content-development-school&academic_year=2024-25&grade=6&section=A
```

## Error Handling

### Common Error Responses

**400 Bad Request**
```json
{
  "error": "Invalid status. Must be one of: not_started, in_progress, completed, on_hold, cancelled"
}
```

**404 Not Found**
```json
{
  "error": "Record not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message details"
}
```

## Best Practices

1. **Batch Operations**: For bulk updates, consider implementing batch write operations
2. **Caching**: Cache frequently accessed data (e.g., class rosters)
3. **Archiving**: Archive completed academic years to a separate table
4. **Monitoring**: Set up CloudWatch alarms for Lambda errors and DynamoDB throttling
5. **Indexing**: Use the appropriate GSI for your query patterns
6. **Validation**: Always validate status values and required fields

## Future Enhancements

- [ ] Batch create/update operations
- [ ] Academic year rollover utility
- [ ] Export functionality (CSV, Excel)
- [ ] Analytics and reporting endpoints
- [ ] Student attendance tracking
- [ ] Assignment and grade tracking
- [ ] Parent notification system
- [ ] Teacher schedule management

