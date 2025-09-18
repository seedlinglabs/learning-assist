# Learning Assist Backend Lambda

This Lambda function provides a REST API for managing topics in the Learning Assist application, with automatic DynamoDB table creation and management.

## Features

- **Auto-provisioning**: Creates DynamoDB table if it doesn't exist
- **CRUD Operations**: Complete Create, Read, Update, Delete operations for topics
- **CORS Support**: Handles cross-origin requests for frontend integration
- **Error Handling**: Comprehensive error handling and validation
- **Global Secondary Index**: Efficient querying by subject_id

## API Endpoints

### Base URL
```
https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod
```

### Endpoints

#### 1. Create Topic
```http
POST /topics
Content-Type: application/json

{
  "name": "Matter",
  "description": "Understanding the properties and states of matter",
  "notebookLMUrl": "https://notebooklm.google.com/notebook/example",
  "subject_id": "subject-class-6-science",
  "school_id": "school-1",
  "class_id": "class-6"
}
```

**Response (201):**
```json
{
  "id": "uuid-generated",
  "name": "Matter",
  "description": "Understanding the properties and states of matter",
  "notebook_lm_url": "https://notebooklm.google.com/notebook/example",
  "subject_id": "subject-class-6-science",
  "school_id": "school-1",
  "class_id": "class-6",
  "created_at": "2024-09-17T12:00:00.000Z",
  "updated_at": "2024-09-17T12:00:00.000Z"
}
```

#### 2. Get All Topics
```http
GET /topics
```

**Response (200):**
```json
[
  {
    "id": "uuid-1",
    "name": "Matter",
    "description": "Understanding properties of matter",
    "notebook_lm_url": "https://notebooklm.google.com/notebook/example",
    "subject_id": "subject-class-6-science",
    "school_id": "school-1",
    "class_id": "class-6",
    "created_at": "2024-09-17T12:00:00.000Z",
    "updated_at": "2024-09-17T12:00:00.000Z"
  }
]
```

#### 3. Get Topics by Subject
```http
GET /topics?subject_id=subject-class-6-science
```

**Response (200):**
```json
[
  {
    "id": "uuid-1",
    "name": "Matter",
    "description": "Understanding properties of matter",
    "notebook_lm_url": "https://notebooklm.google.com/notebook/example",
    "subject_id": "subject-class-6-science",
    "school_id": "school-1",
    "class_id": "class-6",
    "created_at": "2024-09-17T12:00:00.000Z",
    "updated_at": "2024-09-17T12:00:00.000Z"
  }
]
```

#### 4. Get Single Topic
```http
GET /topics/{topic_id}
```

**Response (200):**
```json
{
  "id": "uuid-1",
  "name": "Matter",
  "description": "Understanding properties of matter",
  "notebook_lm_url": "https://notebooklm.google.com/notebook/example",
  "subject_id": "subject-class-6-science",
  "school_id": "school-1",
  "class_id": "class-6",
  "created_at": "2024-09-17T12:00:00.000Z",
  "updated_at": "2024-09-17T12:00:00.000Z"
}
```

#### 5. Update Topic
```http
PUT /topics/{topic_id}
Content-Type: application/json

{
  "name": "Updated Matter Topic",
  "description": "Updated description",
  "notebookLMUrl": "https://notebooklm.google.com/notebook/updated"
}
```

**Response (200):**
```json
{
  "id": "uuid-1",
  "name": "Updated Matter Topic",
  "description": "Updated description",
  "notebook_lm_url": "https://notebooklm.google.com/notebook/updated",
  "subject_id": "subject-class-6-science",
  "school_id": "school-1",
  "class_id": "class-6",
  "created_at": "2024-09-17T12:00:00.000Z",
  "updated_at": "2024-09-17T12:05:00.000Z"
}
```

#### 6. Delete Topic
```http
DELETE /topics/{topic_id}
```

**Response (200):**
```json
{
  "message": "Topic deleted successfully"
}
```

## DynamoDB Table Structure

### Table Name: `learning_assist_topics`

### Primary Key
- **Partition Key**: `id` (String) - Unique topic identifier

### Global Secondary Index
- **Index Name**: `school-class-subject-index`
- **Partition Key**: `subject_id` (String)

### Attributes
- `id` (String): Unique topic identifier
- `name` (String): Topic name
- `description` (String): Topic description
- `notebook_lm_url` (String): NotebookLM URL
- `subject_id` (String): Subject identifier
- `school_id` (String): School identifier  
- `class_id` (String): Class identifier
- `created_at` (String): ISO timestamp of creation
- `updated_at` (String): ISO timestamp of last update

## Deployment Requirements

### IAM Permissions
The Lambda execution role needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateTable",
        "dynamodb:DescribeTable",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/learning_assist_topics",
        "arn:aws:dynamodb:*:*:table/learning_assist_topics/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

### Environment Variables (Optional)
- `TABLE_NAME`: Override default table name (default: `learning_assist_topics`)

### Lambda Configuration
- **Runtime**: Python 3.9+
- **Memory**: 256 MB (minimum)
- **Timeout**: 30 seconds
- **Handler**: `lambda_function.lambda_handler`

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required field: name"
}
```

### 404 Not Found
```json
{
  "error": "Topic not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Error message details"
}
```

## Testing

### Live API Testing with curl

#### 1. Get All Topics
```bash
curl -X GET https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics
```

#### 2. Get Topics by Subject ID
```bash
curl -X GET "https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics?subject_id=subject-class-6-science"
```

#### 3. Create a New Topic
```bash
curl -X POST https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Matter",
    "description": "Understanding the properties and states of matter",
    "notebookLMUrl": "https://notebooklm.google.com/notebook/b066683b-a190-45a0-ade9-a2ae690618b3",
    "subject_id": "subject-class-6-science",
    "school_id": "school-1",
    "class_id": "class-6"
  }'
```

#### 4. Get Single Topic (replace {topic-id} with actual ID from create response)
```bash
curl -X GET https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics/{topic-id}
```

#### 5. Update Topic (replace {topic-id} with actual ID)
```bash
curl -X PUT https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics/{topic-id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Matter Topic",
    "description": "Updated description about matter properties",
    "notebookLMUrl": "https://notebooklm.google.com/notebook/updated-link"
  }'
```

#### 6. Delete Topic (replace {topic-id} with actual ID)
```bash
curl -X DELETE https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics/{topic-id}
```

### Expected Responses

#### Successful Create Response (201):
```json
{
  "id": "12345678-1234-1234-1234-123456789abc",
  "name": "Matter",
  "description": "Understanding the properties and states of matter",
  "notebook_lm_url": "https://notebooklm.google.com/notebook/b066683b-a190-45a0-ade9-a2ae690618b3",
  "subject_id": "subject-class-6-science",
  "school_id": "school-1",
  "class_id": "class-6",
  "created_at": "2024-09-17T18:30:00.000Z",
  "updated_at": "2024-09-17T18:30:00.000Z"
}
```

#### Get All Topics Response (200):
```json
[
  {
    "id": "12345678-1234-1234-1234-123456789abc",
    "name": "Matter",
    "description": "Understanding the properties and states of matter",
    "notebook_lm_url": "https://notebooklm.google.com/notebook/b066683b-a190-45a0-ade9-a2ae690618b3",
    "subject_id": "subject-class-6-science",
    "school_id": "school-1",
    "class_id": "class-6",
    "created_at": "2024-09-17T18:30:00.000Z",
    "updated_at": "2024-09-17T18:30:00.000Z"
  }
]
```

### Sample Lambda Test Event (for AWS Console testing)
```json
{
  "httpMethod": "POST",
  "path": "/topics",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"name\":\"Test Topic\",\"description\":\"Test Description\",\"notebookLMUrl\":\"https://example.com\",\"subject_id\":\"subject-1\",\"school_id\":\"school-1\",\"class_id\":\"class-1\"}"
}
```

## Integration with Frontend

The Lambda is designed to work seamlessly with the React frontend. Update your frontend context to call these API endpoints instead of using local state management.