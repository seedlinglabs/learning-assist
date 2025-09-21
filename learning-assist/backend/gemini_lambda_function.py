import json
import os
import boto3
import requests
from datetime import datetime
import uuid
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
usage_table = dynamodb.Table('learning_assist_gemini_usage')

# Gemini API configuration
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

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
        # Handle preflight requests
        if event['httpMethod'] == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': ''
            }
        
        # Validate API key configuration
        if not GEMINI_API_KEY:
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Gemini API key not configured on server'
                })
            }
        
        # Parse request body
        body = json.loads(event['body']) if event['body'] else {}
        
        # Extract user info for usage tracking (from JWT token)
        user_id = extract_user_from_token(event.get('headers', {}))
        
        # Route to appropriate handler
        path = event['pathParameters']['proxy'] if event.get('pathParameters') else ''
        
        if path == 'generate-content':
            return handle_generate_content(body, user_id, headers)
        elif path == 'discover-documents':
            return handle_discover_documents(body, user_id, headers)
        elif path == 'enhance-section':
            return handle_enhance_section(body, user_id, headers)
        else:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Endpoint not found'})
            }
            
    except Exception as e:
        logger.error(f"Error in gemini proxy: {str(e)}")
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
    except Exception as e:
        logger.warning(f"Failed to track usage: {str(e)}")

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
        MAX_DAILY_REQUESTS = 100  # Configurable limit
        
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
            timeout=30
        )
        
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
            timeout=30
        )
        
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
            timeout=30
        )
        
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
