import json
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
handler = logging.StreamHandler(sys.stdout)
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
usage_table = dynamodb.Table('learning_assist_gemini_usage')

# API configuration
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
CLAUDE_API_KEY = os.environ.get('CLAUDE_API_KEY')
GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
CLAUDE_API_BASE_URL = 'https://api.anthropic.com/v1/messages'

# Consistent timeout for all requests, must be less than API Gateway timeout (29s)
REQUEST_TIMEOUT = 80

# Supported models
SUPPORTED_MODELS = {
    'gemini-2.5-flash': 'gemini',
    'claude-3-5-sonnet-20241022': 'claude'
}

def lambda_handler(event, context):
    """
    Secure proxy for Gemini API calls with usage tracking and authentication
    """
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
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

        if path == 'generate-content':
            return handle_ai_proxy(path, body, user_id, headers)
        elif path == 'discover-documents':
            return handle_ai_proxy(path, body, user_id, headers)
        elif path == 'enhance-section':
            return handle_ai_proxy(path, body, user_id, headers)
        elif path == 'analyze-chapter':
            return handle_ai_proxy(path, body, user_id, headers)
        else:
            logger.warning(f"Unknown endpoint: {path}")
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Endpoint not found'})}
            
    except Exception as e:
        logger.error(f"Error in gemini proxy: {str(e)}", exc_info=True)
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': 'Internal server error', 'details': str(e)})}

def extract_user_from_token(headers):
    """
    Extract user ID from JWT token for usage tracking.
    Note: This is a placeholder and does not validate the token.
    """
    try:
        auth_header = headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
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
        logger.info(f"Usage tracked: {user_id} - {endpoint} - {tokens_used} tokens")
    except Exception as e:
        logger.warning(f"Failed to track usage: {str(e)}")

def check_rate_limit(user_id):
    """Check if user has exceeded rate limits"""
    try:
        today = datetime.utcnow().strftime('%Y-%m-%d')
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
    
    # Extract model from request body, default to Gemini
    model = body.get('model', 'gemini-2.5-flash')
    
    # Validate model
    if model not in SUPPORTED_MODELS:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': f'Unsupported model: {model}. Supported models: {list(SUPPORTED_MODELS.keys())}'})
        }
    
    model_provider = SUPPORTED_MODELS[model]
    
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
    
    # Map proxy path to Gemini model endpoint
    gemini_endpoint_path = f"{model}:{endpoint_name}"
    
    try:
        # Remove model from body before sending to Gemini
        gemini_body = {k: v for k, v in body.items() if k != 'model'}
        
        gemini_response = requests.post(
            f"{GEMINI_API_BASE_URL}/{gemini_endpoint_path}",
            params={'key': GEMINI_API_KEY},
            headers={'Content-Type': 'application/json'},
            json=gemini_body,
            timeout=REQUEST_TIMEOUT
        )
        
        logger.info(f"Gemini API response status: {gemini_response.status_code}")
        response_body = gemini_response.json()
        
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
        logger.error("Request timeout - Gemini API is slow")
        return {
            'statusCode': 504,
            'headers': headers,
            'body': json.dumps({'error': 'Request timeout'})
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"Gemini request error: {str(e)}")
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
        # Convert Gemini format to Claude format
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
        response_body = claude_response.json()
        
        # Convert Claude response back to Gemini format
        gemini_format_response = convert_claude_to_gemini_format(response_body)
        
        # Extract token usage
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
        logger.error("Request timeout - Claude API is slow")
        return {
            'statusCode': 504,
            'headers': headers,
            'body': json.dumps({'error': 'Request timeout'})
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"Claude request error: {str(e)}")
        return {
            'statusCode': 502,
            'headers': headers,
            'body': json.dumps({'error': 'Failed to connect to Claude API'})
        }

def convert_gemini_to_claude_format(gemini_body, model):
    """Convert Gemini API format to Claude API format"""
    # Extract text from Gemini contents format
    messages = []
    if 'contents' in gemini_body:
        for content in gemini_body['contents']:
            if 'parts' in content:
                for part in content['parts']:
                    if 'text' in part:
                        messages.append({
                            'role': 'user',
                            'content': part['text']
                        })
    
    claude_body = {
        'model': model,
        'messages': messages,
        'max_tokens': gemini_body.get('generationConfig', {}).get('maxOutputTokens', 4096),
        'temperature': gemini_body.get('generationConfig', {}).get('temperature', 0.7)
    }
    
    return claude_body

def convert_claude_to_gemini_format(claude_response):
    """Convert Claude API response to Gemini API format"""
    if 'content' in claude_response and claude_response['content']:
        text_content = claude_response['content'][0].get('text', '')
        
        return {
            'candidates': [{
                'content': {
                    'parts': [{'text': text_content}]
                },
                'finishReason': 'STOP'
            }],
            'usageMetadata': {
                'totalTokenCount': claude_response.get('usage', {}).get('input_tokens', 0) + claude_response.get('usage', {}).get('output_tokens', 0)
            }
        }
    else:
        return {
            'candidates': [{
                'content': {
                    'parts': [{'text': 'No content generated'}]
                },
                'finishReason': 'ERROR'
            }]
        }

# The following functions are now just wrappers for the generic handler
def handle_generate_content(body, user_id, headers):
    return handle_ai_proxy('generate-content', body, user_id, headers)

def handle_discover_documents(body, user_id, headers):
    return handle_ai_proxy('discover-documents', body, user_id, headers)
    
def handle_enhance_section(body, user_id, headers):
    return handle_ai_proxy('enhance-section', body, user_id, headers)

def handle_analyze_chapter(body, user_id, headers):
    return handle_ai_proxy('analyze-chapter', body, user_id, headers)