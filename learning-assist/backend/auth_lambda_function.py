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

def verify_simple_token(token: str) -> dict:
    """Verify simple token and return user data"""
    try:
        # Decode base64 token
        token_bytes = base64.b64decode(token.encode('utf-8'))
        token_data = json.loads(token_bytes.decode('utf-8'))
        
        # Check if token is expired
        exp_time = datetime.fromisoformat(token_data['exp'])
        if exp_time < datetime.utcnow():
            return {'valid': False, 'error': 'Token has expired'}
        
        return {'valid': True, 'user': token_data}
        
    except Exception as e:
        return {'valid': False, 'error': f'Invalid token: {str(e)}'}

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
        elif http_method == 'GET' and '/auth/verify' in path:
            return verify_token(event)
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
            'phone_number': user_data.get('phone_number', ''),  # Add phone number field
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
    """Authenticate user with email/password or phone-only (for parents)"""
    try:
        # Check if this is phone-only login (for parent app)
        if 'phone_number' in login_data and 'email' not in login_data and 'password' not in login_data:
            return phone_login_user(table, login_data)
        
        # Validate required fields for email/password login
        if 'email' not in login_data or 'password' not in login_data:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Email and password are required for standard login, or phone_number for parent login'})
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

def phone_login_user(table, login_data):
    """Authenticate user with phone number only (for parent app)"""
    try:
        # Validate required fields
        if 'phone_number' not in login_data:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Phone number is required'})
            }
        
        phone_number = login_data['phone_number'].strip()
        
        # Clean phone number (remove any formatting)
        clean_phone = ''.join(filter(str.isdigit, phone_number))
        
        # Validate phone number format (10 digits or 11 with country code)
        if len(clean_phone) not in [10, 11]:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Invalid phone number format'})
            }
        
        # Normalize to 10 digits (remove country code if present)
        if len(clean_phone) == 11 and clean_phone.startswith('1'):
            clean_phone = clean_phone[1:]
        
        # Search for user by phone number
        # Since we don't have a phone number index, we'll scan the table
        # In production, you should add a GSI on phone_number for better performance
        try:
            response = table.scan(
                FilterExpression='phone_number = :phone',
                ExpressionAttributeValues={':phone': clean_phone}
            )
        except Exception as e:
            # If phone_number attribute doesn't exist, try alternative approaches
            print(f"Phone number scan failed: {str(e)}")
            # For now, we'll check if the phone number matches any user_id or email pattern
            # This is a fallback - in production you should have phone_number as a proper field
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'Phone number not found. Please contact your school administrator to register your phone number.',
                    'error': 'PHONE_NOT_REGISTERED'
                })
            }
        
        users = response.get('Items', [])
        
        if not users:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'Phone number not found. Please contact your school administrator to register your phone number.',
                    'error': 'PHONE_NOT_FOUND'
                })
            }
        
        user = users[0]  # Take the first match
        
        # Verify this is a parent user
        if user.get('user_type') != 'parent':
            return {
                'statusCode': 403,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'This phone number is not registered for parent access.',
                    'error': 'NOT_PARENT_USER'
                })
            }
        
        # Check if user is active
        if not user.get('is_active', True):
            return {
                'statusCode': 403,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'This account has been deactivated. Please contact your school administrator.',
                    'error': 'ACCOUNT_DEACTIVATED'
                })
            }
        
        # Generate simple token
        token = generate_simple_token(user)
        
        # Update last login time
        try:
            table.update_item(
                Key={'user_id': user['user_id']},
                UpdateExpression='SET last_login = :login_time',
                ExpressionAttributeValues={':login_time': datetime.utcnow().isoformat()}
            )
        except Exception as e:
            print(f"Failed to update last login: {str(e)}")
            # Don't fail the login if we can't update last login time
        
        # Return user data (without sensitive info)
        user_response = {
            'user_id': user['user_id'],
            'phone_number': clean_phone,
            'name': user.get('name', 'Parent'),
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
                'success': True,
                'user': user_response,
                'token': token,
                'message': 'Login successful'
            }, cls=DecimalEncoder)
        }
    
    except Exception as e:
        print(f"Phone login error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': False,
                'error': 'Internal server error',
                'message': 'An error occurred during login. Please try again.'
            })
        }

def verify_token(event):
    """Verify token and return user data"""
    try:
        # Get token from Authorization header
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization', '') or headers.get('authorization', '')
        
        if not auth_header.startswith('Bearer '):
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'No token provided'})
            }
        
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        result = verify_simple_token(token)
        
        if result['valid']:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'valid': True,
                    'user': result['user']
                })
            }
        else:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'valid': False,
                    'error': result['error']
                })
            }
    
    except Exception as e:
        print(f"Verify token error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }