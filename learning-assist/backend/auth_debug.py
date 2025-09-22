import json
import traceback

def lambda_handler(event, context):
    """Debug version of auth function with better error handling"""
    try:
        # Try to import required modules
        try:
            import boto3
            from botocore.exceptions import ClientError
            import hashlib
            import base64
            from datetime import datetime, timedelta
            from decimal import Decimal
            import time
            import os
        except ImportError as e:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': f'Import error: {str(e)}',
                    'traceback': traceback.format_exc()
                })
            }
        
        # Try to import JWT
        try:
            import jwt
            jwt_available = True
        except ImportError:
            try:
                from simple_jwt import jwt
                jwt_available = True
            except ImportError:
                jwt_available = False
        
        # Get HTTP method and path
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        
        # Handle CORS preflight
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': ''
            }
        
        # Simple test response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Auth debug function working',
                'jwt_available': jwt_available,
                'method': http_method,
                'path': path,
                'boto3_available': 'boto3' in globals()
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': f'Unexpected error: {str(e)}',
                'traceback': traceback.format_exc()
            })
        }
