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
try:
    import jwt
except ImportError:
    print("ERROR: PyJWT not available")
    jwt = None
import os

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
users_table_name = 'learning_assist_users'

# JWT secret - in production, this should be in environment variables
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'

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

def generate_jwt_token(user_data: dict) -> str:
    """Generate JWT token for authenticated user"""
    if jwt is None:
        raise Exception("PyJWT not available")
    
    payload = {
        'user_id': user_data['user_id'],
        'email': user_data['email'],
        'user_type': user_data['user_type'],
        'name': user_data.get('name', ''),
        'class_access': user_data.get('class_access', []),
        'exp': datetime.utcnow() + timedelta(days=7),  # Token expires in 7 days
        'iat': datetime.utcnow()
    }
    
    try:
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    except AttributeError:
        # Handle different PyJWT versions
        import PyJWT
        return PyJWT.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {'valid': True, 'payload': payload}
    except jwt.ExpiredSignatureError:
        return {'valid': False, 'error': 'Token has expired'}
    except jwt.InvalidTokenError:
        return {'valid': False, 'error': 'Invalid token'}

def lambda_handler(event, context):
    """Main Lambda handler for authentication"""
    try:
        # Create users table if it doesn't exist
        table = create_users_table_if_not_exists()
        
        # Parse the request
        http_method = event.get('httpMethod', '') or event.get('requestContext', {}).get('httpMethod', '')
        path = event.get('path', '') or event.get('requestContext', {}).get('resourcePath', '')
        body = event.get('body', '{}')
        
        # Handle API Gateway v2 format as well
        if not http_method and 'requestContext' in event:
            request_context = event['requestContext']
            if 'http' in request_context:
                http_method = request_context['http'].get('method', '')
                path = request_context['http'].get('path', '')
        
        # Debug logging
        print(f"DEBUG: HTTP Method: {http_method}")
        print(f"DEBUG: Path: {path}")
        
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
        
        # Route requests based on HTTP method and path
        if http_method == 'POST':
            if '/auth/register' in path:
                return register_user(table, body)
            elif '/auth/login' in path:
                return login_user(table, body)
        
        elif http_method == 'GET':
            if '/auth/verify' in path:
                # Get token from Authorization header
                headers = event.get('headers', {})
                auth_header = headers.get('Authorization', '') or headers.get('authorization', '')
                if auth_header.startswith('Bearer '):
                    token = auth_header[7:]
                    return verify_token(token)
                else:
                    return {
                        'statusCode': 401,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'No token provided'})
                    }
            elif '/auth/user/' in path:
                user_id = path.split('/auth/user/')[-1]
                return get_user(table, user_id)
        
        elif http_method == 'PUT' and '/auth/user/' in path:
            user_id = path.split('/auth/user/')[-1]
            return update_user(table, user_id, body)
        
        else:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'Endpoint not found',
                    'available_routes': [
                        'POST /auth/register',
                        'POST /auth/login',
                        'GET /auth/verify',
                        'GET /auth/user/{id}',
                        'PUT /auth/user/{id}'
                    ]
                })
            }
    
    except Exception as e:
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
        
        # Validate user type
        valid_user_types = ['teacher', 'student', 'parent']
        if user_data['user_type'] not in valid_user_types:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': f'Invalid user type. Must be one of: {valid_user_types}'})
            }
        
        # Check if user already exists
        try:
            existing_user = table.query(
                IndexName='email-index',
                KeyConditionExpression=boto3.dynamodb.conditions.Key('email').eq(user_data['email'])
            )
            if existing_user['Items']:
                return {
                    'statusCode': 409,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'User with this email already exists'})
                }
        except Exception as e:
            print(f"Error checking existing user: {e}")
        
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
            'class_access': user_data.get('class_access', []),  # Array of class IDs for parents
            'school_id': user_data.get('school_id', ''),  # Optional school association
            'is_active': True,
            'created_at': current_time,
            'updated_at': current_time,
            'last_login': None
        }
        
        # Save to DynamoDB
        table.put_item(Item=item)
        
        # Generate JWT token
        token = generate_jwt_token(item)
        
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
        
        # Check if user is active
        if not user.get('is_active', True):
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Account is deactivated'})
            }
        
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
        
        # Update last login time
        table.update_item(
            Key={'user_id': user['user_id']},
            UpdateExpression='SET last_login = :timestamp',
            ExpressionAttributeValues={':timestamp': datetime.utcnow().isoformat()}
        )
        
        # Generate JWT token
        token = generate_jwt_token(user)
        
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
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }

def verify_token(token):
    """Verify JWT token"""
    try:
        result = verify_jwt_token(token)
        
        if result['valid']:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'valid': True,
                    'user': result['payload']
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
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }

def get_user(table, user_id):
    """Get user by ID"""
    try:
        response = table.get_item(Key={'user_id': user_id})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'User not found'})
            }
        
        user = response['Item']
        
        # Return user data (without sensitive info)
        user_response = {
            'user_id': user['user_id'],
            'email': user['email'],
            'name': user['name'],
            'user_type': user['user_type'],
            'class_access': user.get('class_access', []),
            'school_id': user.get('school_id', ''),
            'is_active': user.get('is_active', True),
            'created_at': user['created_at'],
            'last_login': user.get('last_login')
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(user_response, cls=DecimalEncoder)
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }

def update_user(table, user_id, update_data):
    """Update user information"""
    try:
        # Check if user exists
        existing_response = table.get_item(Key={'user_id': user_id})
        if 'Item' not in existing_response:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'User not found'})
            }
        
        # Prepare update expression
        update_expression = "SET updated_at = :updated_at"
        expression_values = {':updated_at': datetime.utcnow().isoformat()}
        
        # Add fields to update (excluding sensitive fields)
        updatable_fields = ['name', 'class_access', 'school_id', 'is_active']
        
        for field in updatable_fields:
            if field in update_data:
                update_expression += f", {field} = :{field}"
                expression_values[f':{field}'] = update_data[field]
        
        # Handle password update separately
        if 'password' in update_data:
            password_hash, salt = hash_password(update_data['password'])
            update_expression += ", password_hash = :password_hash, salt = :salt"
            expression_values[':password_hash'] = password_hash
            expression_values[':salt'] = salt
        
        # Perform update
        response = table.update_item(
            Key={'user_id': user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
            ReturnValues="ALL_NEW"
        )
        
        # Return updated user data (without sensitive info)
        updated_user = response['Attributes']
        user_response = {
            'user_id': updated_user['user_id'],
            'email': updated_user['email'],
            'name': updated_user['name'],
            'user_type': updated_user['user_type'],
            'class_access': updated_user.get('class_access', []),
            'school_id': updated_user.get('school_id', ''),
            'is_active': updated_user.get('is_active', True),
            'updated_at': updated_user['updated_at']
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(user_response, cls=DecimalEncoder)
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
