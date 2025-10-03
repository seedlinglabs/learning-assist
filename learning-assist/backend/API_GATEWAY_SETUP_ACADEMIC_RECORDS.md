# API Gateway Setup for Academic Records Lambda

This guide explains how to add the academic records endpoints to your existing API Gateway.

## Overview

The academic records Lambda function handles multiple endpoints:
- `/academic-records` - Main resource for CRUD operations
- `/academic-records/{record_id}/{topic_id}` - Specific record operations

## Existing API Gateway

**API Name**: (Your existing API - likely the one with `/auth` and `/topics`)  
**Base URL**: `https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod`  
**Lambda Function**: `academic-records-service`

## API Gateway Configuration

### Step 1: Create Resources

Navigate to your API Gateway console and create the following resource structure:

```
/
├── auth (existing)
├── topics (existing)
└── academic-records (NEW)
    └── {record_id} (NEW)
        └── {topic_id} (NEW)
```

#### 1.1 Create `/academic-records` Resource

1. Go to API Gateway Console
2. Select your existing API
3. Click "Resources" in the left menu
4. Click "Actions" → "Create Resource"
5. Configure:
   - **Resource Name**: `academic-records`
   - **Resource Path**: `/academic-records`
   - ☑ Enable CORS
6. Click "Create Resource"

#### 1.2 Create `/{record_id}` Resource

1. Select `/academic-records` resource
2. Click "Actions" → "Create Resource"
3. Configure:
   - **Resource Name**: `record_id`
   - **Resource Path**: `/{record_id}`
   - ☑ Enable CORS
4. Click "Create Resource"

#### 1.3 Create `/{topic_id}` Resource

1. Select `/academic-records/{record_id}` resource
2. Click "Actions" → "Create Resource"
3. Configure:
   - **Resource Name**: `topic_id`
   - **Resource Path**: `/{topic_id}`
   - ☑ Enable CORS
4. Click "Create Resource"

### Step 2: Create Methods

#### 2.1 Methods for `/academic-records`

**POST Method** (Create Record)
1. Select `/academic-records` resource
2. Click "Actions" → "Create Method"
3. Select "POST" from dropdown
4. Click the checkmark
5. Configure:
   - **Integration type**: Lambda Function
   - **Use Lambda Proxy integration**: ☑ (checked)
   - **Lambda Region**: us-west-2
   - **Lambda Function**: `academic-records-service`
6. Click "Save"
7. Click "OK" to give API Gateway permission

**GET Method** (Query Records)
1. Select `/academic-records` resource
2. Click "Actions" → "Create Method"
3. Select "GET" from dropdown
4. Click the checkmark
5. Configure:
   - **Integration type**: Lambda Function
   - **Use Lambda Proxy integration**: ☑ (checked)
   - **Lambda Region**: us-west-2
   - **Lambda Function**: `academic-records-service`
6. Click "Save"

**OPTIONS Method** (CORS)
1. Select `/academic-records` resource
2. Click "Actions" → "Enable CORS"
3. Configure:
   - **Access-Control-Allow-Methods**: DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT
   - **Access-Control-Allow-Headers**: Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token
   - **Access-Control-Allow-Origin**: *
4. Click "Enable CORS and replace existing CORS headers"

#### 2.2 Methods for `/academic-records/{record_id}/{topic_id}`

**GET Method** (Get Specific Record)
1. Select `/academic-records/{record_id}/{topic_id}` resource
2. Click "Actions" → "Create Method"
3. Select "GET" from dropdown
4. Configure Lambda integration as above
5. Click "Save"

**PUT Method** (Update Record)
1. Select `/academic-records/{record_id}/{topic_id}` resource
2. Click "Actions" → "Create Method"
3. Select "PUT" from dropdown
4. Configure Lambda integration as above
5. Click "Save"

**DELETE Method** (Delete Record)
1. Select `/academic-records/{record_id}/{topic_id}` resource
2. Click "Actions" → "Create Method"
3. Select "DELETE" from dropdown
4. Configure Lambda integration as above
5. Click "Save"

**OPTIONS Method** (CORS)
1. Select `/academic-records/{record_id}/{topic_id}` resource
2. Enable CORS as described above

### Step 3: Deploy API

1. Click "Actions" → "Deploy API"
2. Select **Deployment stage**: `pre-prod` (or your existing stage)
3. Add **Deployment description**: "Added academic records endpoints"
4. Click "Deploy"

### Step 4: Verify Endpoints

After deployment, your endpoints should be:

```
# Base URL
https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod

# Create record
POST /academic-records

# Query records
GET /academic-records?parent_phone=X
GET /academic-records?teacher_id=X
GET /academic-records?school_id=X
GET /academic-records?school_id=X&academic_year=Y&grade=Z&section=W

# Get specific record
GET /academic-records/{record_id}/{topic_id}

# Update record
PUT /academic-records/{record_id}/{topic_id}

# Delete record
DELETE /academic-records/{record_id}/{topic_id}
```

## Testing the Endpoints

### Test 1: Create a Record

```bash
curl -X POST https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/academic-records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
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
    "status": "in_progress"
  }'
```

### Test 2: Query by Parent Phone

```bash
curl -X GET "https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/academic-records?parent_phone=9900509938" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 3: Get Specific Record

```bash
# Note: Use URL encoding for the record_id
curl -X GET "https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/academic-records/content-development-school%232024-25%236%23A%23science/topic-photosynthesis" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 4: Update Record

```bash
curl -X PUT "https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/academic-records/content-development-school%232024-25%236%23A%23science/topic-photosynthesis" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "completed",
    "end_date": "2024-10-15"
  }'
```

### Test 5: Delete Record

```bash
curl -X DELETE "https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/academic-records/content-development-school%232024-25%236%23A%23science/topic-photosynthesis" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Quick Setup Checklist

- [ ] Deploy academic records Lambda function
- [ ] Create `/academic-records` resource with CORS
- [ ] Create `/{record_id}` sub-resource with CORS
- [ ] Create `/{topic_id}` sub-resource with CORS
- [ ] Add POST method to `/academic-records`
- [ ] Add GET method to `/academic-records`
- [ ] Add GET method to `/{record_id}/{topic_id}`
- [ ] Add PUT method to `/{record_id}/{topic_id}`
- [ ] Add DELETE method to `/{record_id}/{topic_id}`
- [ ] Enable CORS on all resources
- [ ] Deploy API to `pre-prod` stage
- [ ] Test all endpoints with cURL
- [ ] Update frontend `REACT_APP_ACADEMIC_RECORDS_API_URL` if needed

## Resource Summary

| Resource | Methods | Purpose |
|----------|---------|---------|
| `/academic-records` | POST, GET, OPTIONS | Create record, query records |
| `/academic-records/{record_id}/{topic_id}` | GET, PUT, DELETE, OPTIONS | Get, update, delete specific record |

## Query Parameters for GET /academic-records

| Parameter | Description | Example |
|-----------|-------------|---------|
| `parent_phone` | Query by parent's phone number | `?parent_phone=9900509938` |
| `teacher_id` | Query by teacher ID | `?teacher_id=teacher-123` |
| `school_id` | Query by school ID | `?school_id=content-development-school` |
| `school_id` + `academic_year` + `grade` + `section` | Query by specific class | `?school_id=X&academic_year=2024-25&grade=6&section=A` |

## Path Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `record_id` | Composite ID: `{school}#{year}#{grade}#{section}#{subject}` | `content-development-school#2024-25#6#A#science` |
| `topic_id` | Topic identifier | `topic-photosynthesis` |

## CORS Configuration

Make sure CORS is properly configured to allow:
- **Methods**: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT
- **Headers**: Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token
- **Origin**: * (or specify your frontend domain)

## IAM Permissions Required

The Lambda execution role needs:

```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:CreateTable",
    "dynamodb:DescribeTable",
    "dynamodb:PutItem",
    "dynamodb:GetItem",
    "dynamodb:UpdateItem",
    "dynamodb:DeleteItem",
    "dynamodb:Query",
    "dynamodb:Scan",
    "dynamodb:ListTables"
  ],
  "Resource": [
    "arn:aws:dynamodb:us-west-2:143320675925:table/academic_records",
    "arn:aws:dynamodb:us-west-2:143320675925:table/academic_records/index/*"
  ]
}
```

## Troubleshooting

### 403 Forbidden
- Check that Lambda has permission to access DynamoDB
- Verify API Gateway has permission to invoke Lambda
- Check CORS configuration

### 500 Internal Server Error
- Check Lambda logs in CloudWatch
- Verify DynamoDB table exists or Lambda can create it
- Check Lambda timeout (should be at least 30 seconds)

### CORS Errors
- Enable CORS on all resources
- Verify OPTIONS method exists
- Check response headers include Access-Control-Allow-Origin

## Frontend Integration

Update your frontend service:

```typescript
// src/services/academicRecordsService.ts
const API_BASE_URL = process.env.REACT_APP_ACADEMIC_RECORDS_API_URL || 
                     'https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod';
```

Or add to `.env`:
```
REACT_APP_ACADEMIC_RECORDS_API_URL=https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod
```

## Complete!

After following these steps, your academic records API will be fully integrated with your existing API Gateway and ready to use from both the admin panel and parent app.

