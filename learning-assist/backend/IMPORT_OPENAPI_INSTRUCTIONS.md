# Import OpenAPI Specification into AWS API Gateway

This guide explains how to import the `academic-records-api-openapi.yaml` file to create a new API Gateway.

## Prerequisites

- AWS Console access
- Lambda function `academic-records-service` deployed
- IAM role: `arn:aws:iam::143320675925:role/service-role/learning-assist-lambda-role-k2v61duu`

## Method 1: Import via AWS Console

### Step 1: Navigate to API Gateway

1. Open AWS Console
2. Go to **API Gateway** service
3. Select region: **us-west-2** (Oregon)

### Step 2: Import API

1. Click **"Create API"**
2. Select **"REST API"** (not Private or HTTP API)
3. Click **"Build"**
4. In the **"Create new API"** section:
   - Select **"Import from OpenAPI"**
   - Click **"Browse"** or drag-and-drop
   - Select the file: `academic-records-api-openapi.yaml`
5. Review the API structure preview
6. Click **"Import"**

### Step 3: Configure Lambda Permissions

After import, you need to grant API Gateway permission to invoke your Lambda:

```bash
aws lambda add-permission \
  --function-name academic-records-service \
  --statement-id apigateway-academic-records-access \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-west-2:143320675925:*/*/academic-records*" \
  --region us-west-2
```

Or in AWS Console:
1. Go to **Lambda** → **academic-records-service**
2. Click **"Configuration"** tab → **"Permissions"**
3. Scroll to **"Resource-based policy statements"**
4. Click **"Add permissions"**
   - **Service**: API Gateway
   - **Source ARN**: Your API Gateway ARN
   - Click **"Save"**

### Step 4: Create Deployment Stage

1. In API Gateway console, select your new API
2. Click **"Actions"** → **"Deploy API"**
3. **Deployment stage**: Select **"[New Stage]"**
4. **Stage name**: `pre-prod`
5. **Stage description**: Production-ready pre-release stage
6. **Deployment description**: Initial deployment
7. Click **"Deploy"**

### Step 5: Get Invoke URL

After deployment, you'll see:
- **Invoke URL**: `https://[API_ID].execute-api.us-west-2.amazonaws.com/pre-prod`

Example:
```
https://abc123xyz.execute-api.us-west-2.amazonaws.com/pre-prod
```

### Step 6: Test the API

Test with cURL:

```bash
# Replace [API_ID] with your actual API ID
export API_URL="https://[API_ID].execute-api.us-west-2.amazonaws.com/pre-prod"

# Test OPTIONS (CORS)
curl -X OPTIONS $API_URL/academic-records

# Test GET (should return empty array initially)
curl -X GET "$API_URL/academic-records?school_id=content-development-school" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test POST (create a record)
curl -X POST $API_URL/academic-records \
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
    "status": "in_progress"
  }'
```

## Method 2: Import via AWS CLI

```bash
# Navigate to backend directory
cd learning-assist/backend

# Import the API
aws apigateway import-rest-api \
  --body file://academic-records-api-openapi.yaml \
  --region us-west-2 \
  --fail-on-warnings

# This will return an API ID, save it
export API_ID="abc123xyz"

# Grant Lambda permission
aws lambda add-permission \
  --function-name academic-records-service \
  --statement-id apigateway-academic-records-access \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-west-2:143320675925:${API_ID}/*/*" \
  --region us-west-2

# Create deployment
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name pre-prod \
  --stage-description "Pre-production stage" \
  --description "Initial deployment" \
  --region us-west-2

# Get the invoke URL
echo "API URL: https://${API_ID}.execute-api.us-west-2.amazonaws.com/pre-prod"
```

## Method 3: Automated Script

Create a deployment script:

```bash
#!/bin/bash

# deploy-api-gateway.sh
set -e

REGION="us-west-2"
FUNCTION_NAME="academic-records-service"
OPENAPI_FILE="academic-records-api-openapi.yaml"
STAGE_NAME="pre-prod"

echo "Importing API from OpenAPI specification..."
API_RESPONSE=$(aws apigateway import-rest-api \
  --body file://$OPENAPI_FILE \
  --region $REGION \
  --output json)

API_ID=$(echo $API_RESPONSE | jq -r '.id')
API_NAME=$(echo $API_RESPONSE | jq -r '.name')

echo "✓ API imported successfully"
echo "  API ID: $API_ID"
echo "  API Name: $API_NAME"

echo ""
echo "Granting Lambda invoke permission..."
aws lambda add-permission \
  --function-name $FUNCTION_NAME \
  --statement-id apigateway-${API_ID}-access \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:143320675925:${API_ID}/*/*" \
  --region $REGION \
  2>/dev/null || echo "Permission already exists"

echo "✓ Lambda permission granted"

echo ""
echo "Creating deployment..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name $STAGE_NAME \
  --stage-description "Pre-production stage" \
  --description "Automated deployment from OpenAPI spec" \
  --region $REGION

echo "✓ Deployment created"

INVOKE_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE_NAME}"

echo ""
echo "=========================================="
echo "API Deployment Complete!"
echo "=========================================="
echo ""
echo "API ID: $API_ID"
echo "API Name: $API_NAME"
echo "Stage: $STAGE_NAME"
echo "Invoke URL: $INVOKE_URL"
echo ""
echo "Test your API:"
echo "curl -X GET \"${INVOKE_URL}/academic-records?school_id=content-development-school\""
echo ""
```

Make it executable and run:
```bash
chmod +x deploy-api-gateway.sh
./deploy-api-gateway.sh
```

## Updating the OpenAPI Spec

If you need to update the API after making changes to the OpenAPI file:

### Via Console:
1. Go to API Gateway
2. Select your API
3. Click **"Actions"** → **"Import from OpenAPI"**
4. Select **"Merge"** or **"Overwrite"**
5. Upload the updated file
6. Review changes
7. Click **"Import"**
8. Deploy the API again

### Via CLI:
```bash
aws apigateway put-rest-api \
  --rest-api-id $API_ID \
  --mode merge \
  --body file://academic-records-api-openapi.yaml \
  --region us-west-2

# Redeploy
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name pre-prod \
  --region us-west-2
```

## Update Frontend Configuration

After deployment, update your frontend to use the new API URL:

### Option 1: Environment Variable

Create/update `.env` file:
```
REACT_APP_ACADEMIC_RECORDS_API_URL=https://[API_ID].execute-api.us-west-2.amazonaws.com/pre-prod
```

### Option 2: Update Service Directly

Edit `src/services/academicRecordsService.ts`:
```typescript
const API_BASE_URL = 'https://[API_ID].execute-api.us-west-2.amazonaws.com/pre-prod';
```

## Verify Endpoints

After deployment, verify all endpoints are working:

```bash
export API_URL="https://[API_ID].execute-api.us-west-2.amazonaws.com/pre-prod"

# 1. OPTIONS (CORS preflight)
curl -X OPTIONS $API_URL/academic-records -v

# 2. POST (Create)
curl -X POST $API_URL/academic-records \
  -H "Content-Type: application/json" \
  -d '{"school_id":"content-development-school","academic_year":"2024-25","grade":"6","section":"A","subject_id":"science","subject_name":"Science","topic_id":"topic-test","topic_name":"Test Topic","status":"not_started"}'

# 3. GET (Query)
curl -X GET "$API_URL/academic-records?school_id=content-development-school"

# 4. GET (Specific)
curl -X GET "$API_URL/academic-records/content-development-school%232024-25%236%23A%23science/topic-test"

# 5. PUT (Update)
curl -X PUT "$API_URL/academic-records/content-development-school%232024-25%236%23A%23science/topic-test" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'

# 6. DELETE
curl -X DELETE "$API_URL/academic-records/content-development-school%232024-25%236%23A%23science/topic-test"
```

## Troubleshooting

### Issue: 403 Forbidden
**Solution**: Check Lambda permissions. Ensure API Gateway has permission to invoke the Lambda function.

### Issue: 502 Bad Gateway
**Solution**: Check Lambda function logs in CloudWatch. The Lambda might be timing out or erroring.

### Issue: CORS Errors
**Solution**: Verify OPTIONS methods are configured correctly. Check that CORS headers are present in responses.

### Issue: Missing Authorization
**Solution**: Ensure you're passing the `Authorization: Bearer TOKEN` header in requests.

### Issue: Invalid API Gateway ARN
**Solution**: Update the Lambda function ARN in the OpenAPI file if it's different:
```yaml
uri: arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:143320675925:function:academic-records-service/invocations
```

## Clean Up

To delete the API if needed:

```bash
# Via CLI
aws apigateway delete-rest-api \
  --rest-api-id $API_ID \
  --region us-west-2

# Via Console
# 1. Go to API Gateway
# 2. Select the API
# 3. Actions → Delete API
```

## Next Steps

After successful import and deployment:

1. ✅ Test all endpoints with cURL
2. ✅ Update frontend API URL
3. ✅ Test from admin panel
4. ✅ Document the API URL for team
5. ✅ Set up CloudWatch alarms for monitoring
6. ✅ Consider adding API throttling/rate limiting
7. ✅ Set up custom domain name (optional)

## Summary

- ✅ OpenAPI file: `academic-records-api-openapi.yaml`
- ✅ Import creates complete API with all endpoints
- ✅ Includes CORS configuration
- ✅ Lambda proxy integration configured
- ✅ Security scheme (Bearer JWT) defined
- ✅ Request/response schemas documented
- ✅ Ready for immediate use after import

The OpenAPI import is the fastest way to create a production-ready API Gateway!

