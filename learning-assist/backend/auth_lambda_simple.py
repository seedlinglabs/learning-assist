import json
import boto3
import uuid
import hashlib
import hmac
import base64
from datetime import datetime, timedelta
from decimal import Decimal
from botocore.exceptions import ClientError
import time
import os

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
users_table_name = 'learning_assist_users'

# Simple token secret - in production, this should be more secure
TOKEN_SECRET = os.environ.get('JWT_SECRET', 'default-secret-key')

class DecimalEncoder(json.JSONEncoder):
    """Helper class to convert Decimal objects to float for JSON serialization"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def create_users_table_if_not_exists():
    """Create the DynamoDB users table if it doesn't exist"""
    try:
        # Check if table exists
        table = dynamodb.Table(users_table_name)
        table.load()
        return table
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            # Table doesn't exist, create it
            table = dynamodb.create_table(
                TableName=users_table_name,
                KeySchema=[
                    {
                        'AttributeName': 'user_id',
                        'KeyType': 'HASH'  # Partition key
                    }
                ],
                GlobalSecondaryIndexes=[
                    {
                        'IndexName': 'email-index',
                        'KeySchema': [
                            {
                                'AttributeName': 'email',
                                'KeyType': 'HASH'
                            }
                        ],
                        'Projection': {
                            'ProjectionType': 'ALL'
                        },
                        'ProvisionedThroughput': {
                            'ReadCapacityUnits': 5,
                            'WriteCapacityUnits': 5
                        }
                    }
                ],
                AttributeDefinitions=[
                    {
                        'AttributeName': 'user_id',
                        'AttributeType': 'S'
                    },
                    {
                        'AttributeName': 'email',
                        'AttributeType': 'S'
                    }
                ],
                ProvisionedThroughput={
                    'ReadCapacityUnits': 5,
                    'WriteCapacityUnits': 5
                }
            )
            
            # Wait for table to be created
            table.meta.client.get_waiter('table_exists').wait(TableName=users_table_name)
            return table
        else:
            raise e

def hash_password(password: str, salt: str = None) -> tuple:
    """Hash password with salt"""
    if salt is None:
        salt = base64.b64encode(os.urandom(32)).decode('utf-8')
    
    # Use PBKDF2 for secure password hashing
    password_hash = hashlib.pbkdf2_hmac('sha256', 
                                       password.encode('utf-8'), 
                                       salt.encode('utf-8'), 
                                       100000)  # 100,000 iterations
    
    return base64.b64encode(password_hash).decode('utf-8'), salt

def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    """Verify password against stored hash"""
    computed_hash, _ = hash_password(password, salt)
    return hmac.compare_digest(stored_hash, computed_hash)

def generate_simple_token(user_data: dict) -> str:
    """Generate simple token without JWT (for testing)"""
    token_data = {
        'user_id': user_data['user_id'],
        'email': user_data['email'],
        'user_type': user_data['user_type'],
        'exp': (datetime.utcnow() + timedelta(days=7)).isoformat()
    }
    
    # Simple base64 encoding (not secure for production)
    token_json = json.dumps(token_data)
    token_bytes = token_json.encode('utf-8')
    return base64.b64encode(token_bytes).decode('utf-8')

def lambda_handler(event, context):
    """Main Lambda handler for authentication"""
    try:
        # Create users table if it doesn't exist
        table = create_users_table_if_not_exists()
        
        # Parse the request
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        body = event.get('body', '{}')
        
        print(f"DEBUG: HTTP Method: {http_method}")
        print(f"DEBUG: Path: {path}")
        print(f"DEBUG: Body: {body}")
        
        if body:
            try:
                body = json.loads(body)
            except json.JSONDecodeError:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
                    },
                    'body': json.dumps({'error': 'Invalid JSON in request body'})
                }
        
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
        
        # Route requests
        if http_method == 'POST' and '/auth/register' in path:
            return register_user(table, body)
        elif http_method == 'POST' and '/auth/login' in path:
            return login_user(table, body)
        else:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Endpoint not found'})
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

def register_user(table, user_data):
    """Register a new user"""
    try:
        # Validate required fields
        required_fields = ['email', 'password', 'name', 'user_type']
        for field in required_fields:
            if field not in user_data:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': f'Missing required field: {field}'})
                }
        
        # Generate unique user ID and hash password
        user_id = str(uuid.uuid4())
        password_hash, salt = hash_password(user_data['password'])
        current_time = datetime.utcnow().isoformat()
        
        # Prepare user item
        item = {
            'user_id': user_id,
            'email': user_data['email'].lower().strip(),
            'password_hash': password_hash,
            'salt': salt,
            'name': user_data['name'].strip(),
            'user_type': user_data['user_type'],
            'class_access': user_data.get('class_access', []),
            'school_id': user_data.get('school_id', ''),
            'is_active': True,
            'created_at': current_time,
            'updated_at': current_time,
            'last_login': None
        }
        
        # Save to DynamoDB
        table.put_item(Item=item)
        
        # Generate simple token
        token = generate_simple_token(item)
        
        # Return user data (without sensitive info)
        user_response = {
            'user_id': user_id,
            'email': item['email'],
            'name': item['name'],
            'user_type': item['user_type'],
            'class_access': item['class_access'],
            'school_id': item['school_id'],
            'created_at': current_time
        }
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'user': user_response,
                'token': token,
                'message': 'User registered successfully'
            }, cls=DecimalEncoder)
        }
    
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }

def login_user(table, login_data):
    """Authenticate user login"""
    try:
        # Validate required fields
        if 'email' not in login_data or 'password' not in login_data:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Email and password are required'})
            }
        
        email = login_data['email'].lower().strip()
        password = login_data['password']
        
        # Find user by email
        response = table.query(
            IndexName='email-index',
            KeyConditionExpression=boto3.dynamodb.conditions.Key('email').eq(email)
        )
        
        if not response['Items']:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Invalid email or password'})
            }
        
        user = response['Items'][0]
        
        # Verify password
        if not verify_password(password, user['password_hash'], user['salt']):
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Invalid email or password'})
            }
        
        # Generate simple token
        token = generate_simple_token(user)
        
        # Return user data (without sensitive info)
        user_response = {
            'user_id': user['user_id'],
            'email': user['email'],
            'name': user['name'],
            'user_type': user['user_type'],
            'class_access': user.get('class_access', []),
            'school_id': user.get('school_id', ''),
            'last_login': datetime.utcnow().isoformat()
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'user': user_response,
                'token': token,
                'message': 'Login successful'
            }, cls=DecimalEncoder)
        }
    
    except Exception as e:
        print(f"Login error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
