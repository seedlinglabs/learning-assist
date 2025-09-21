# Learning Assistant - Backend Deployment

## 🚀 Deployment Process

### Prerequisites
- AWS CLI installed and configured
- Appropriate AWS permissions (Lambda, API Gateway, IAM, DynamoDB)

### Step-by-Step Deployment

#### 1. Check Current Status
```bash
cd backend
./check-status.sh
```

#### 2. Deploy Components (as needed)
```bash
# Deploy Topics Lambda
./deploy-topics-only.sh

# Deploy Auth Lambda  
./deploy-auth-only.sh

# Setup API Gateway endpoints
./deploy-api-gateway.sh
```

#### 3. Verify Deployment
```bash
./check-status.sh
```

The modular approach allows you to:
- ✅ Deploy components independently
- ✅ Fix specific issues without full redeployment
- ✅ Clear error messages for each component
- ✅ Fast deployment (each script ~30-60 seconds)

### What Gets Created

#### **Lambda Functions:**
- `learning-assist-topics` - Topics CRUD operations
- `learning-assist-auth` - User authentication

#### **DynamoDB Tables:**
- `learning_assist_topics` - Topic data storage
- `learning_assist_users` - User accounts (created automatically)

#### **API Gateway:**
- REST API with all endpoints
- CORS enabled for web app
- Production stage deployment

#### **API Endpoints Created:**
```
📚 Topics API:
GET    /topics
GET    /topics?subject_id=<id>
GET    /topics/{id}
POST   /topics
PUT    /topics/{id}
DELETE /topics/{id}

🔐 Authentication API:
POST   /auth/register
POST   /auth/login
GET    /auth/verify
GET    /auth/user/{id}
PUT    /auth/user/{id}
```

### After Deployment

1. **API URL** will be displayed in console output
2. **Frontend files** automatically updated with new URLs
3. **Environment file** created with all configuration
4. **JWT secret** generated and configured

### Testing the API

#### **Test User Registration:**
```bash
curl -X POST https://YOUR_API_URL/prod/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@test.com",
    "password": "password123",
    "name": "Test Teacher",
    "user_type": "teacher"
  }'
```

#### **Test User Login:**
```bash
curl -X POST https://YOUR_API_URL/prod/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@test.com",
    "password": "password123"
  }'
```

#### **Test Topics API:**
```bash
curl https://YOUR_API_URL/prod/topics
```

### Troubleshooting

#### **If deployment fails:**
1. Check AWS CLI configuration: `aws sts get-caller-identity`
2. Verify AWS permissions for Lambda, API Gateway, IAM, DynamoDB
3. Check CloudWatch Logs for Lambda errors

#### **If CORS issues:**
- CORS is automatically configured by the script
- Check browser network tab for CORS errors
- Verify API Gateway deployment was successful

#### **If authentication fails:**
- Check JWT_SECRET environment variable in Lambda
- Verify DynamoDB users table was created
- Check CloudWatch Logs for auth Lambda errors

### Available Scripts

- `check-status.sh` - Check deployment status and test all endpoints
- `deploy-topics-only.sh` - Deploy/update topics Lambda function
- `deploy-auth-only.sh` - Deploy/update auth Lambda function  
- `deploy-api-gateway.sh` - Setup API Gateway endpoints and CORS

### Manual Cleanup (if needed)

```bash
# Delete Lambda functions
aws lambda delete-function --function-name learning-assist-topics
aws lambda delete-function --function-name learning-assist-auth

# Delete API Gateway
aws apigateway delete-rest-api --rest-api-id xvq11x0421

# Delete IAM role (AWS may append random suffix to role name)
ROLE_NAME=$(aws iam list-roles --query "Roles[?starts_with(RoleName, 'learning-assist-lambda-role')].RoleName" --output text)
aws iam detach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam detach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
aws iam delete-role --role-name $ROLE_NAME

# Delete DynamoDB tables
aws dynamodb delete-table --table-name learning_assist_topics
aws dynamodb delete-table --table-name learning_assist_users
```

## 🔧 Files Overview

- `auth_lambda_function.py` - Authentication Lambda function
- `lambda_function.py` - Topics Lambda function  
- `requirements.txt` - Python dependencies
- `deploy.sh` - Automated deployment script
- `.env` - Environment configuration (generated)

## 🔒 Security Notes

- JWT secret is randomly generated for each deployment
- Passwords are hashed with PBKDF2 + salt
- API Gateway has CORS properly configured
- IAM roles follow least privilege principle