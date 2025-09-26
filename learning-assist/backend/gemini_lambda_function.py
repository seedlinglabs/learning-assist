import json
import os
import boto3
import requests
from datetime import datetime
import uuid
import logging
import sys  # Added for StreamHandler to enable CloudWatch logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Add a StreamHandler to output to stdout (captured by Lambda/CloudWatch)
handler = logging.StreamHandler(sys.stdout)
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
usage_table = dynamodb.Table('learning_assist_gemini_usage')

# Gemini API configuration
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

def lambda_handler(event, context):
    """
    Secure proxy for Gemini API calls with usage tracking and authentication
    """
    
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }
    
    try:
        logger.info(f"Lambda invoked with method: {event.get('httpMethod', 'UNKNOWN')}")
        
        # Handle preflight requests
        if event['httpMethod'] == 'OPTIONS':
            logger.info("Handling OPTIONS request")
            return {
                'statusCode': 200,
                'headers': headers,
                'body': ''
            }
        
        # Validate API key configuration
        if not GEMINI_API_KEY:
            logger.error("Gemini API key not configured")
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Gemini API key not configured on server'
                })
            }
        
        # Parse request body
        try:
            body = json.loads(event['body']) if event['body'] else {}
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in request body: {str(e)}")
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Invalid JSON in request body'})
            }
        
        # Extract user info for usage tracking (from JWT token)
        user_id = extract_user_from_token(event.get('headers', {}))
        logger.info(f"Request from user: {user_id}")
        
        # Route to appropriate handler
        path = event['pathParameters']['proxy'] if event.get('pathParameters') else ''
        logger.info(f"Routing to path: {path}")
        
        if path == 'generate-content':
            return handle_generate_content(body, user_id, headers)
        elif path == 'discover-documents':
            return handle_discover_documents(body, user_id, headers)
        elif path == 'enhance-section':
            return handle_enhance_section(body, user_id, headers)
        elif path == 'analyze-chapter':
            return handle_analyze_chapter(body, user_id, headers)
        else:
            logger.warning(f"Unknown endpoint: {path}")
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Endpoint not found'})
            }
            
    except Exception as e:
        logger.error(f"Error in gemini proxy: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            })
        }

def extract_user_from_token(headers):
    """Extract user ID from JWT token for usage tracking"""
    try:
        auth_header = headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            # In production, decode and validate JWT token
            # For now, return a placeholder
            return 'anonymous'
    except:
        pass
    return 'anonymous'

def track_usage(user_id, endpoint, tokens_used=0):
    """Track API usage for billing and monitoring"""
    try:
        usage_table.put_item(Item={
            'usage_id': str(uuid.uuid4()),
            'user_id': user_id,
            'endpoint': endpoint,
            'tokens_used': tokens_used,
            'timestamp': datetime.utcnow().isoformat(),
            'date': datetime.utcnow().strftime('%Y-%m-%d')
        })
        logger.info(f"Usage tracked: {user_id} - {endpoint}")
    except Exception as e:
        logger.warning(f"Failed to track usage: {str(e)}")
        # Don't fail the request if usage tracking fails

def check_rate_limit(user_id):
    """Check if user has exceeded rate limits"""
    try:
        # Simple daily limit check - can be enhanced
        today = datetime.utcnow().strftime('%Y-%m-%d')
        
        response = usage_table.scan(
            FilterExpression='user_id = :uid AND #date = :today',
            ExpressionAttributeNames={'#date': 'date'},
            ExpressionAttributeValues={':uid': user_id, ':today': today}
        )
        
        daily_requests = len(response['Items'])
        MAX_DAILY_REQUESTS = 1000  # Configurable limit
        
        logger.info(f"Rate limit check: {user_id} - {daily_requests}/{MAX_DAILY_REQUESTS}")
        return daily_requests < MAX_DAILY_REQUESTS, daily_requests
        
    except Exception as e:
        logger.warning(f"Rate limit check failed: {str(e)}")
        return True, 0  # Allow on error

def handle_generate_content(body, user_id, headers):
    """Handle content generation requests"""
    
    # Check rate limits
    allowed, current_usage = check_rate_limit(user_id)
    if not allowed:
        return {
            'statusCode': 429,
            'headers': headers,
            'body': json.dumps({
                'error': 'Daily rate limit exceeded',
                'current_usage': current_usage
            })
        }
    
    try:
        # Forward request to Gemini API
        gemini_response = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            headers={'Content-Type': 'application/json'},
            json=body,
<<<<<<< HEAD
            timeout=90
=======
            timeout=30
>>>>>>> 0df31e9 (Config: set all maxOutputTokens to 4096 across services)
        )
        
        # Log Gemini response for monitoring
        logger.info(f"Gemini response status: {gemini_response.status_code}")
        logger.info(f"Gemini response body!!!!!!!!!!!!: {gemini_response.text}")
        
        # Track usage
        track_usage(user_id, 'generate-content')
        
        

        return {
            'statusCode': gemini_response.status_code,
            'headers': headers,
            'body': gemini_response.text
        }
        
    except requests.exceptions.Timeout:
        return {
            'statusCode': 504,
            'headers': headers,
            'body': json.dumps({'error': 'Request timeout'})
        }
    except Exception as e:
        logger.error(f"Gemini API error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Failed to generate content'})
        }

def handle_discover_documents(body, user_id, headers):
    """Handle document discovery requests"""
    
    allowed, _ = check_rate_limit(user_id)
    if not allowed:
        return {
            'statusCode': 429,
            'headers': headers,
            'body': json.dumps({'error': 'Daily rate limit exceeded'})
        }
    
    try:
        gemini_response = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            headers={'Content-Type': 'application/json'},
            json=body,
<<<<<<< HEAD
            timeout=90
=======
            timeout=30
>>>>>>> 0df31e9 (Config: set all maxOutputTokens to 4096 across services)
        )
        
        # Log Gemini response for monitoring
        logger.info(f"Gemini response status: {gemini_response.status_code}")
        logger.info(f"Gemini response body&&&&&&&&&&&&: {gemini_response.text}")
        
        track_usage(user_id, 'discover-documents')
        
        return {
            'statusCode': gemini_response.status_code,
            'headers': headers,
            'body': gemini_response.text
        }
        
    except Exception as e:
        logger.error(f"Document discovery error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Failed to discover documents'})
        }

def handle_enhance_section(body, user_id, headers):
    """Handle section enhancement requests"""
    
    allowed, _ = check_rate_limit(user_id)
    if not allowed:
        return {
            'statusCode': 429,
            'headers': headers,
            'body': json.dumps({'error': 'Daily rate limit exceeded'})
        }
    
    try:
        gemini_response = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            headers={'Content-Type': 'application/json'},
            json=body,
<<<<<<< HEAD
            timeout=90
=======
            timeout=30
>>>>>>> 0df31e9 (Config: set all maxOutputTokens to 4096 across services)
        )
        
        # Log Gemini response for monitoring
        logger.info(f"Gemini response status***********: {gemini_response.status_code}")
        logger.info(f"Gemini response body ***********: {gemini_response.text}")
        
        track_usage(user_id, 'enhance-section')
        
        return {
            'statusCode': gemini_response.status_code,
            'headers': headers,
            'body': gemini_response.text
        }
        
    except Exception as e:
        logger.error(f"Section enhancement error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Failed to enhance section'})
        }

def handle_analyze_chapter(body, user_id, headers):
    """
    Handle chapter analysis requests for topic splitting
    """
    try:
        logger.info(f"Chapter analysis request received. User: {user_id}, Body keys: {list(body.keys())}")
        
        # Log content size for debugging
        if 'contents' in body and body['contents']:
            content_size = len(json.dumps(body['contents']))
            logger.info(f"Content size: {content_size} characters")
        
        # Validate required fields
        required_fields = ['contents']
        for field in required_fields:
            if field not in body:
                logger.error(f"Missing required field: {field}")
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': f'Missing required field: {field}'})
                }
        
        # Prepare Gemini API request
        gemini_payload = {
            'contents': body['contents'],
            'generationConfig': body.get('generationConfig', {
                'temperature': 0.7,
                'topK': 40,
                'topP': 0.95,
                'maxOutputTokens': 8192
            })
        }
        
        # Make request to Gemini API
        gemini_url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
        logger.info(f"Making request to Gemini API. Payload size: {len(json.dumps(gemini_payload))} characters")
        
        gemini_response = requests.post(gemini_url, json=gemini_payload, timeout=120)  # 25s to stay under API Gateway limit
        
        logger.info(f"Gemini API response status: {gemini_response.status_code}")
        
        if gemini_response.status_code != 200:
            logger.error(f"Gemini API error: {gemini_response.status_code} - {gemini_response.text}")
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': 'Gemini API request failed'})
            }
        
        # Log Gemini response for monitoring
        logger.info(f"Gemini response status: {gemini_response.status_code}")
        logger.info(f"Gemini response body##############: {gemini_response.text}")
        
        # Track usage
        try:
            track_usage(user_id, 'analyze-chapter')
        except Exception as track_error:
            logger.warning(f"Usage tracking failed: {track_error}")
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': gemini_response.text
        }
        
    except requests.exceptions.Timeout:
        logger.error("Request timeout - content may be too large or Gemini API is slow")
        return {
            'statusCode': 504,
            'headers': headers,
            'body': json.dumps({'error': 'Request timeout - try with smaller content or try again later'})
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error: {str(e)}")
        return {
            'statusCode': 502,
            'headers': headers,
            'body': json.dumps({'error': 'Failed to connect to Gemini API'})
        }
    except Exception as e:
        logger.error(f"Chapter analysis error: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Failed to analyze chapter'})
        }