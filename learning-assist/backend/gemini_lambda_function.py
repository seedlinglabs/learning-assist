import json
from math import log
import os
import boto3
import requests
from datetime import datetime
import uuid
import logging
import sys

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)
# Prevent duplicate handlers if the script is run multiple times (e.g., in testing)
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

# Initialize DynamoDB
# Assume 'learning_assist_gemini_usage' exists and is configured correctly
dynamodb = boto3.resource('dynamodb')
usage_table = dynamodb.Table('learning_assist_gemini_usage')

# API configuration
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
CLAUDE_API_KEY = os.environ.get('CLAUDE_API_KEY')
GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
CLAUDE_API_BASE_URL = 'https://api.anthropic.com/v1/messages'

# CRITICAL FIX: Set timeout to be less than the 80s API Gateway timeout.
REQUEST_TIMEOUT = 80

# Supported models
SUPPORTED_MODELS = {
    'gemini-2.5-pro': 'gemini',
    'claude-3-5-sonnet-20241022': 'claude'
}

# --- Utility Functions ---

def lambda_handler(event, context):
    """
    Secure proxy for AI API calls with usage tracking and authentication
    """
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }
    
    try:
        if event.get('httpMethod') == 'OPTIONS':
            logger.info("Handling OPTIONS request")
            return {'statusCode': 200, 'headers': headers, 'body': ''}
        
        if not GEMINI_API_KEY and not CLAUDE_API_KEY:
            logger.error("No API keys configured")
            return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': 'No API keys configured on server'})}
        
        try:
            body = json.loads(event['body']) if event.get('body') else {}
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in request body: {str(e)}")
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Invalid JSON in request body'})}
        
        user_id = extract_user_from_token(event.get('headers', {}))
        logger.info(f"Request from user: {user_id}")
        
        path = event.get('pathParameters', {}).get('proxy')
        logger.info(f"Routing to path: {path}")

        # Use a list of allowed endpoints for cleaner routing
        ALLOWED_ENDPOINTS = ['generate-content', 'discover-documents', 'enhance-section', 'analyze-chapter']

        if path in ALLOWED_ENDPOINTS:
            return handle_ai_proxy(path, body, user_id, headers)
        else:
            logger.warning(f"Unknown endpoint: {path}")
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Endpoint not found'})}
            
    except Exception as e:
        logger.error(f"Error in gemini proxy: {str(e)}", exc_info=True)
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': 'Internal server error', 'details': str(e)})}

def extract_user_from_token(headers):
    """
    Extract user ID from JWT token for usage tracking. (Placeholder)
    NOTE: In a production environment, this should perform JWT validation.
    """
    try:
        auth_header = headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            # Placeholder: In production, extract claims like 'sub' from validated JWT
            return 'authenticated_user'
    except:
        pass
    return 'anonymous'

def track_usage(user_id, endpoint, tokens_used=0):
    """Track API usage for billing and monitoring"""
    try:
        # NOTE: Using 'usage_id' as PK and 'timestamp' for sorting/indexing is recommended.
        usage_table.put_item(Item={
            'usage_id': str(uuid.uuid4()),
            'user_id': user_id,
            'endpoint': endpoint,
            'tokens_used': tokens_used,
            'timestamp': datetime.utcnow().isoformat(),
            'date': datetime.utcnow().strftime('%Y-%m-%d')
        })
        logger.info(f"Usage tracked: {user_id} - {endpoint} - {tokens_used} tokens")
    except Exception as e:
        logger.warning(f"Failed to track usage: {str(e)}")

def check_rate_limit(user_id):
    """Check if user has exceeded rate limits (basic implementation using scan)"""
    try:
        today = datetime.utcnow().strftime('%Y-%m-%d')
        
        # NOTE: A 'scan' is inefficient for large tables. For production, 
        # a DynamoDB GSI on 'date' or a more efficient query is recommended.
        response = usage_table.scan(
            FilterExpression='user_id = :uid AND #date = :today',
            ExpressionAttributeNames={'#date': 'date'},
            ExpressionAttributeValues={':uid': user_id, ':today': today}
        )
        daily_requests = len(response['Items'])
        MAX_DAILY_REQUESTS = 1000
        return daily_requests < MAX_DAILY_REQUESTS, daily_requests
    except Exception as e:
        logger.warning(f"Rate limit check failed: {str(e)}")
        return True, 0

# --- AI Proxy Handlers ---

def handle_ai_proxy(endpoint_name, body, user_id, headers):
    """
    Generic handler for AI API proxy requests supporting multiple models.
    """
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
    
    logger.info(f"OriginalBody: {body}")
    model = body.get('model', 'gemini-2.5-pro')
    
    if model not in SUPPORTED_MODELS:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': f'Unsupported model: {model}. Supported models: {list(SUPPORTED_MODELS.keys())}'})
        }

    logger.info(f"Model: {model}")
    model_provider = SUPPORTED_MODELS[model]
    
    logger.info(f"Model provider: {model_provider}")
    try:
        if model_provider == 'gemini':
            return handle_gemini_request(endpoint_name, body, user_id, headers, model)
        elif model_provider == 'claude':
            return handle_claude_request(endpoint_name, body, user_id, headers, model)
        else:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': f'Unknown model provider: {model_provider}'})
            }
            
    except Exception as e:
        logger.error(f"AI API error: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Failed to generate content'})
        }

def handle_gemini_request(endpoint_name, body, user_id, headers, model):
    """Handle Gemini API requests"""
    if not GEMINI_API_KEY:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Gemini API key not configured'})
        }
    
    # Map proxy path to Gemini model endpoint. Note: The external endpoint path is
    # always 'generateContent' regardless of the custom internal path (e.g. 'discover-documents')
    # unless the internal path directly maps to a different Gemini method (e.g. 'embedContent')
    gemini_endpoint_path = f"{model}:generateContent" 
    
    try:
        # Remove model from body before sending to Gemini
        gemini_body = {k: v for k, v in body.items() if k != 'model'}
        
        # Ensure 'generateContent' is used as the method in the URL path
        # Note: If the user intended custom endpoints to map to other API methods (e.g., embedContent),
        # this logic would need to be updated. Assuming all map to generateContent for now.
        
        gemini_response = requests.post(
            f"{GEMINI_API_BASE_URL}/{gemini_endpoint_path}",
            params={'key': GEMINI_API_KEY},
            headers={'Content-Type': 'application/json'},
            json=gemini_body,
            timeout=REQUEST_TIMEOUT
        )
        
        logger.info(f"Gemini API response status: {gemini_response.status_code}")
        response_body = gemini_response.json()
        logger.info(f"Gemini API response body: {response_body}")
        
        # Check for MAX_TOKENS error
        if gemini_response.status_code == 200 and 'candidates' in response_body and response_body['candidates'][0].get('finishReason') == 'MAX_TOKENS':
            logger.warning("Gemini response finished with MAX_TOKENS reason")
            return {
                'statusCode': 422,
                'headers': headers,
                'body': json.dumps({'error': 'Output token limit exceeded. Try a shorter prompt or reduce the complexity of your request.'})
            }
        
        # Extract token usage
        tokens_used = 0
        if 'usageMetadata' in response_body:
            tokens_used = response_body['usageMetadata'].get('totalTokenCount', 0)
        
        track_usage(user_id, f"{endpoint_name}-{model}", tokens_used)
        
        return {
            'statusCode': gemini_response.status_code,
            'headers': headers,
            'body': json.dumps(response_body)
        }
        
    except requests.exceptions.Timeout:
        logger.error(f"Request timeout after {REQUEST_TIMEOUT}s - Gemini API is slow")
        return {
            'statusCode': 504,
            'headers': headers,
            'body': json.dumps({'error': 'Request timeout'})
        }
    except requests.exceptions.RequestException as e:
        # This is the exception caught when the 502 error occurs in the logs
        logger.error(f"Gemini request network error (502 likely): {str(e)}")
        return {
            'statusCode': 502,
            'headers': headers,
            'body': json.dumps({'error': 'Failed to connect to Gemini API'})
        }

def handle_claude_request(endpoint_name, body, user_id, headers, model):
    """Handle Claude API requests"""
    if not CLAUDE_API_KEY:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Claude API key not configured'})
        }
    
    try:
        claude_body = convert_gemini_to_claude_format(body, model)
        
        claude_response = requests.post(
            CLAUDE_API_BASE_URL,
            headers={
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            json=claude_body,
            timeout=REQUEST_TIMEOUT
        )
        
        logger.info(f"Claude API response status: {claude_response.status_code}")
        
        # Log response details for debugging
        if claude_response.status_code != 200:
            logger.error(f"Claude API error response: {claude_response.text}")
        
        response_body = claude_response.json()
        
        # Convert Claude response back to Gemini format
        gemini_format_response = convert_claude_to_gemini_format(response_body)
        
        # Extract token usage from the *original* Claude response for tracking
        tokens_used = 0
        if 'usage' in response_body:
            tokens_used = response_body['usage'].get('input_tokens', 0) + response_body['usage'].get('output_tokens', 0)
        
        track_usage(user_id, f"{endpoint_name}-{model}", tokens_used)
        
        return {
            'statusCode': claude_response.status_code,
            'headers': headers,
            'body': json.dumps(gemini_format_response)
        }
        
    except requests.exceptions.Timeout:
        logger.error(f"Request timeout after {REQUEST_TIMEOUT}s - Claude API is slow")
        return {
            'statusCode': 504,
            'headers': headers,
            'body': json.dumps({'error': 'Request timeout'})
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"Claude request network error: {str(e)}")
        return {
            'statusCode': 502,
            'headers': headers,
            'body': json.dumps({'error': 'Failed to connect to Claude API'})
        }

def convert_gemini_to_claude_format(gemini_body, model):
    """Convert Gemini API format to Claude API format"""
    messages = []
    if 'contents' in gemini_body:
        # Assuming the Gemini contents follow a simple user/model chat pattern
        for content in gemini_body['contents']:
            role = 'user' if content.get('role', 'user') == 'user' else 'assistant'
            # Claude only supports 'text' and 'image' parts, assuming only text for simplicity
            if 'parts' in content:
                for part in content['parts']:
                    if 'text' in part:
                        messages.append({
                            'role': role,
                            'content': part['text']
                        })
    
    # Extract generation configuration
    generation_config = gemini_body.get('generationConfig', {})
    
    claude_body = {
        'model': model,
        'messages': messages,
        # Default Claude max_tokens is 4096. Mapping Gemini's maxOutputTokens.
        'max_tokens': generation_config.get('maxOutputTokens', 4096),
        # Mapping Gemini's temperature
        'temperature': generation_config.get('temperature', 0.7)
    }
    
    return claude_body

def convert_claude_to_gemini_format(claude_response):
    """
    Convert Claude API response to Gemini API format.
    Includes logic to translate Claude's max_tokens reason.
    """
    # Extract response text
    text_content = ''
    if 'content' in claude_response and claude_response['content']:
        text_content = claude_response['content'][0].get('text', '')
        
    # Determine finish reason based on Claude's stop_reason
    finish_reason = 'STOP'
    if 'stop_reason' in claude_response:
        if claude_response['stop_reason'] == 'max_tokens':
            finish_reason = 'MAX_TOKENS' # Match Gemini's finishReason
        # Other stop reasons ('end_turn', 'stop_sequence') map logically to STOP
        
    # Extract token usage for consistency
    tokens_used = 0
    if 'usage' in claude_response:
        tokens_used = claude_response['usage'].get('input_tokens', 0) + claude_response['usage'].get('output_tokens', 0)
    
    return {
        'candidates': [{
            'content': {
                'parts': [{'text': text_content}]
            },
            'finishReason': finish_reason
        }],
        'usageMetadata': {
            'totalTokenCount': tokens_used
        }
}