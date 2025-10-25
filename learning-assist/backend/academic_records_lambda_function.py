"""
Academic Records Management Lambda Function

Manages mappings of:
- Academic Year (2024-25, 2025-26, etc.)
- Grade (1, 2, 3, etc.)
- Section (A, B, C, D, etc.)
- Subject
- Topic
- Teacher
- Status (not_started, in_progress, completed, etc.)
- Parent Phone Number

DynamoDB Table Structure:
- Table Name: academic_records
- Partition Key: record_id (String) - Format: {school_id}#{academic_year}#{grade}#{section}#{subject_id}
- Sort Key: topic_id (String)
- GSI1: parent_phone (String) - For querying by parent
- GSI2: teacher_id (String) - For querying by teacher
- GSI3: school_id (String) - For querying by school
"""

import json
import boto3
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, List, Optional

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
dynamodb_client = boto3.client('dynamodb')

TABLE_NAME = 'academic_records'

# Status options
VALID_STATUSES = ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled']


class DecimalEncoder(json.JSONEncoder):
    """Helper class to convert DynamoDB Decimal types to JSON"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def create_table_if_not_exists():
    """Create DynamoDB table if it doesn't exist"""
    try:
        # Check if table exists
        existing_tables = dynamodb_client.list_tables()['TableNames']
        
        if TABLE_NAME in existing_tables:
            print(f"Table {TABLE_NAME} already exists")
            return True
        
        print(f"Creating table {TABLE_NAME}...")
        
        # Create table
        table = dynamodb.create_table(
            TableName=TABLE_NAME,
            KeySchema=[
                {
                    'AttributeName': 'record_id',
                    'KeyType': 'HASH'  # Partition key
                },
                {
                    'AttributeName': 'topic_id',
                    'KeyType': 'RANGE'  # Sort key
                }
            ],
            AttributeDefinitions=[
                {'AttributeName': 'record_id', 'AttributeType': 'S'},
                {'AttributeName': 'topic_id', 'AttributeType': 'S'},
                {'AttributeName': 'parent_phone', 'AttributeType': 'S'},
                {'AttributeName': 'teacher_id', 'AttributeType': 'S'},
                {'AttributeName': 'school_id', 'AttributeType': 'S'},
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'parent_phone-index',
                    'KeySchema': [
                        {'AttributeName': 'parent_phone', 'KeyType': 'HASH'},
                        {'AttributeName': 'topic_id', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                },
                {
                    'IndexName': 'teacher_id-index',
                    'KeySchema': [
                        {'AttributeName': 'teacher_id', 'KeyType': 'HASH'},
                        {'AttributeName': 'topic_id', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                },
                {
                    'IndexName': 'school_id-index',
                    'KeySchema': [
                        {'AttributeName': 'school_id', 'KeyType': 'HASH'},
                        {'AttributeName': 'record_id', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                }
            ],
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )
        
        # Wait for table to be created
        print(f"Waiting for table {TABLE_NAME} to be created...")
        table.wait_until_exists()
        print(f"Table {TABLE_NAME} created successfully")
        
        return True
        
    except Exception as e:
        print(f"Error creating table: {str(e)}")
        return False


def generate_record_id(school_id: str, academic_year: str, grade: str, section: str, subject_id: str) -> str:
    """Generate a composite record ID"""
    return f"{school_id}#{academic_year}#{grade}#{section}#{subject_id}"


def create_academic_record(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new academic record"""
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        # Generate record_id
        record_id = generate_record_id(
            data['school_id'],
            data['academic_year'],
            data['grade'],
            data['section'],
            data['subject_id']
        )
        
        # Validate status
        status = data.get('status', 'not_started')
        if status not in VALID_STATUSES:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': f'Invalid status. Must be one of: {VALID_STATUSES}'})
            }
        
        # Create record
        record = {
            'record_id': record_id,
            'topic_id': data['topic_id'],
            'school_id': data['school_id'],
            'academic_year': data['academic_year'],
            'grade': str(data['grade']),
            'section': data['section'].upper(),
            'subject_id': data['subject_id'],
            'subject_name': data.get('subject_name', ''),
            'topic_name': data.get('topic_name', ''),
            'status': status,
            'notes': data.get('notes', ''),
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # Only add teacher fields if they have values (DynamoDB doesn't allow empty strings in GSI keys)
        if data.get('teacher_id'):
            record['teacher_id'] = data['teacher_id']
        if data.get('teacher_name'):
            record['teacher_name'] = data['teacher_name']
        
        # Add to DynamoDB
        table.put_item(Item=record)
        
        return {
            'statusCode': 201,
            'body': json.dumps(record, cls=DecimalEncoder)
        }
        
    except Exception as e:
        print(f"Error creating record: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def get_academic_record(record_id: str, topic_id: str) -> Dict[str, Any]:
    """Get a specific academic record"""
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        response = table.get_item(
            Key={
                'record_id': record_id,
                'topic_id': topic_id
            }
        )
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Record not found'})
            }
        
        return {
            'statusCode': 200,
            'body': json.dumps(response['Item'], cls=DecimalEncoder)
        }
        
    except Exception as e:
        print(f"Error getting record: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def update_academic_record(record_id: str, topic_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing academic record"""
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        # Build update expression
        update_expr = "SET updated_at = :updated_at"
        expr_values = {':updated_at': datetime.utcnow().isoformat()}
        
        # Add updateable fields
        updateable_fields = [
            'status', 'teacher_id', 'teacher_name', 'subject_name', 'topic_name', 'notes'
        ]
        
        for field in updateable_fields:
            if field in updates:
                if field == 'status' and updates[field] not in VALID_STATUSES:
                    return {
                        'statusCode': 400,
                        'body': json.dumps({'error': f'Invalid status. Must be one of: {VALID_STATUSES}'})
                    }
                update_expr += f", {field} = :{field}"
                expr_values[f':{field}'] = updates[field]
        
        # Update record
        response = table.update_item(
            Key={
                'record_id': record_id,
                'topic_id': topic_id
            },
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ReturnValues='ALL_NEW'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps(response['Attributes'], cls=DecimalEncoder)
        }
        
    except Exception as e:
        print(f"Error updating record: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def delete_academic_record(record_id: str, topic_id: str) -> Dict[str, Any]:
    """Delete an academic record"""
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        table.delete_item(
            Key={
                'record_id': record_id,
                'topic_id': topic_id
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Record deleted successfully'})
        }
        
    except Exception as e:
        print(f"Error deleting record: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


# Parent phone query removed - parent fields no longer used


def query_by_teacher_id(teacher_id: str) -> Dict[str, Any]:
    """Query records by teacher ID"""
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        response = table.query(
            IndexName='teacher_id-index',
            KeyConditionExpression='teacher_id = :teacher',
            ExpressionAttributeValues={
                ':teacher': teacher_id
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps(response['Items'], cls=DecimalEncoder)
        }
        
    except Exception as e:
        print(f"Error querying by teacher: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def query_by_school_id(school_id: str) -> Dict[str, Any]:
    """Query records by school ID"""
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        response = table.query(
            IndexName='school_id-index',
            KeyConditionExpression='school_id = :school',
            ExpressionAttributeValues={
                ':school': school_id
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps(response['Items'], cls=DecimalEncoder)
        }
        
    except Exception as e:
        print(f"Error querying by school: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def list_records_by_class(school_id: str, academic_year: str, grade: str, section: str) -> Dict[str, Any]:
    """List all records for a specific class"""
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        # Query by school_id and filter by record_id pattern
        record_id_prefix = f"{school_id}#{academic_year}#{grade}#{section}#"
        
        response = table.query(
            IndexName='school_id-index',
            KeyConditionExpression='school_id = :school AND begins_with(record_id, :prefix)',
            ExpressionAttributeValues={
                ':school': school_id,
                ':prefix': record_id_prefix
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps(response['Items'], cls=DecimalEncoder)
        }
        
    except Exception as e:
        print(f"Error listing records by class: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def query_by_topic_id(topic_id: str) -> Dict[str, Any]:
    """Query all records for a specific topic"""
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        # Scan with filter (topic_id is the sort key, so we need to scan)
        response = table.scan(
            FilterExpression='topic_id = :topic_id',
            ExpressionAttributeValues={
                ':topic_id': topic_id
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps(response['Items'], cls=DecimalEncoder)
        }
        
    except Exception as e:
        print(f"Error querying by topic: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def lambda_handler(event, context):
    """Main Lambda handler"""
    print(f"Event: {json.dumps(event)}")
    
    # Ensure table exists
    create_table_if_not_exists()
    
    # Set CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }
    
    # Handle OPTIONS request for CORS
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    try:
        # Get HTTP method and path
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        
        # Parse body if present
        body = {}
        if event.get('body'):
            body = json.loads(event['body'])
        
        # Parse query parameters
        query_params = event.get('queryStringParameters') or {}
        
        # Route requests
        if path == '/academic-records':
            if http_method == 'POST':
                # Create new record
                response = create_academic_record(body)
            elif http_method == 'GET':
                # Query records
                if 'teacher_id' in query_params:
                    response = query_by_teacher_id(query_params['teacher_id'])
                elif 'school_id' in query_params:
                    if all(k in query_params for k in ['academic_year', 'grade', 'section']):
                        response = list_records_by_class(
                            query_params['school_id'],
                            query_params['academic_year'],
                            query_params['grade'],
                            query_params['section']
                        )
                    else:
                        response = query_by_school_id(query_params['school_id'])
                else:
                    response = {
                        'statusCode': 400,
                        'body': json.dumps({'error': 'Missing query parameter'})
                    }
            else:
                response = {
                    'statusCode': 405,
                    'body': json.dumps({'error': 'Method not allowed'})
                }
        
        elif path.startswith('/records/topic/'):
            # Handle GET /records/topic/{topicId}
            path_parts = path.split('/')
            if len(path_parts) >= 4:
                topic_id = path_parts[3]
                if http_method == 'GET':
                    response = query_by_topic_id(topic_id)
                else:
                    response = {
                        'statusCode': 405,
                        'body': json.dumps({'error': 'Method not allowed'})
                    }
            else:
                response = {
                    'statusCode': 400,
                    'body': json.dumps({'error': 'Invalid path format'})
                }
        
        elif path.startswith('/academic-records/'):
            # Extract record_id and topic_id from path
            # Format: /academic-records/{record_id}/{topic_id}
            path_parts = path.split('/')
            if len(path_parts) >= 4:
                record_id = path_parts[2]
                topic_id = path_parts[3]
                
                if http_method == 'GET':
                    response = get_academic_record(record_id, topic_id)
                elif http_method == 'PUT':
                    response = update_academic_record(record_id, topic_id, body)
                elif http_method == 'DELETE':
                    response = delete_academic_record(record_id, topic_id)
                else:
                    response = {
                        'statusCode': 405,
                        'body': json.dumps({'error': 'Method not allowed'})
                    }
            else:
                response = {
                    'statusCode': 400,
                    'body': json.dumps({'error': 'Invalid path format'})
                }
        
        else:
            response = {
                'statusCode': 404,
                'body': json.dumps({'error': 'Endpoint not found'})
            }
        
        # Add headers to response
        response['headers'] = headers
        return response
        
    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }

