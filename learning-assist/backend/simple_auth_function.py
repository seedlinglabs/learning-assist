import json
import boto3
import uuid
from datetime import datetime

def lambda_handler(event, context):
    """Simple auth Lambda handler for testing"""
    try:
        # Parse the request
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        body = event.get('body', '{}')
        
        print(f"DEBUG: Method: {http_method}, Path: {path}")
        print(f"DEBUG: Body: {body}")
        
        # Handle CORS preflight
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
                },
                'body': ''
            }
        
        # Simple response for testing
        if '/auth/register' in path and http_method == 'POST':
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Auth function is working!',
                    'method': http_method,
                    'path': path,
                    'timestamp': datetime.utcnow().isoformat()
                })
            }
        
        # Default response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Simple auth function responding',
                'method': http_method,
                'path': path
            })
        }
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
