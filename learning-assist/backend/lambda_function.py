import json
import boto3
import uuid
from datetime import datetime
from decimal import Decimal
from botocore.exceptions import ClientError
import time

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = 'learning_assist_topics'

class DecimalEncoder(json.JSONEncoder):
    """Helper class to convert Decimal objects to float for JSON serialization"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def create_table_if_not_exists():
    """Create the DynamoDB table if it doesn't exist"""
    try:
        # Check if table exists
        table = dynamodb.Table(table_name)
        table.load()
        return table
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            # Table doesn't exist, create it
            table = dynamodb.create_table(
                TableName=table_name,
                KeySchema=[
                    {
                        'AttributeName': 'id',
                        'KeyType': 'HASH'  # Partition key
                    }
                ],
                GlobalSecondaryIndexes=[
                    {
                        'IndexName': 'school-class-subject-index',
                        'KeySchema': [
                            {
                                'AttributeName': 'subject_id',
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
                        'AttributeName': 'id',
                        'AttributeType': 'S'
                    },
                    {
                        'AttributeName': 'subject_id',
                        'AttributeType': 'S'
                    }
                ],
                ProvisionedThroughput={
                    'ReadCapacityUnits': 5,
                    'WriteCapacityUnits': 5
                }
            )
            
            # Wait for table to be created
            table.meta.client.get_waiter('table_exists').wait(TableName=table_name)
            return table
        else:
            raise e

def lambda_handler(event, context):
    """Main Lambda handler"""
    try:
        # Create table if it doesn't exist
        table = create_table_if_not_exists()
        
        # Parse the request - handle both proxy and non-proxy integration
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
        print(f"DEBUG: Full event keys: {list(event.keys())}")
        print(f"DEBUG: HTTP Method: {http_method}")
        print(f"DEBUG: Path: {path}")
        print(f"DEBUG: Body: {body if body else 'None'}")  # Full body
        print(f"DEBUG: Request Context: {event.get('requestContext', {})}")
        
        if body:
            try:
                body = json.loads(body)
            except json.JSONDecodeError:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
                    },
                    'body': json.dumps({'error': 'Invalid JSON in request body'})
                }
        
        query_params = event.get('queryStringParameters') or {}
        
        # Handle CORS preflight
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
                },
                'body': ''
            }
        
        # Route requests based on HTTP method and path
        if http_method == 'GET':
            if '/topics/' in path:
                # Get single topic by ID
                topic_id = path.split('/topics/')[-1]
                return get_topic(table, topic_id)
            elif '/topics' in path:
                # Get topics by subject_id or all topics
                subject_id = query_params.get('subject_id')
                if subject_id:
                    return get_topics_by_subject(table, subject_id)
                else:
                    return get_all_topics(table)
        
        elif http_method == 'POST' and '/topics' in path:
            return create_topic(table, body)
        
        elif http_method == 'PUT' and '/topics/' in path:
            topic_id = path.split('/topics/')[-1]
            print(f"DEBUG: PUT request for topic_id: {topic_id}")
            return update_topic(table, topic_id, body)
        
        elif http_method == 'DELETE' and '/topics/' in path:
            topic_id = path.split('/topics/')[-1]
            print(f"DEBUG: DELETE request for topic_id: {topic_id}")
            return delete_topic(table, topic_id)
        
        else:
            print(f"DEBUG: No route matched - Method: {http_method}, Path: {path}")
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'Endpoint not found',
                    'debug': {
                        'method': http_method,
                        'path': path,
                        'available_routes': [
                            'GET /topics',
                            'GET /topics/{id}',
                            'POST /topics',
                            'PUT /topics/{id}',
                            'DELETE /topics/{id}'
                        ]
                    }
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

def generate_name_from_url(url: str) -> str:
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        path = parsed.path or ''
        last = [seg for seg in path.split('/') if seg][-1] if path else ''
        base = last.split('?')[0].split('#')[0]
        base = base.rsplit('.', 1)[0] if '.' in base else (base or parsed.netloc)
        base = base.replace('-', ' ').replace('_', ' ')
        words = [w for w in base.split(' ') if w]
        titled = ' '.join([w.upper() if len(w) <= 3 else (w[0].upper() + w[1:]) for w in words])
        return titled or parsed.netloc
    except Exception:
        return url[:60]

def validate_document_link(link):
    """Validate a document link object"""
    if not isinstance(link, dict):
        return False, "Document link must be an object"
    if 'url' not in link:
        return False, "Document link must have a URL"
    if not isinstance(link['url'], str) or not link['url'].strip():
        return False, "Document link URL must be a non-empty string"
    if 'name' in link and (not isinstance(link['name'], str) or not link['name'].strip()):
        return False, "If provided, document link name must be a non-empty string"
    return True, None

def create_topic(table, topic_data):
    """Create a new topic"""
    try:
        # Validate required fields
        required_fields = ['name', 'subject_id', 'school_id', 'class_id']
        for field in required_fields:
            if field not in topic_data:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': f'Missing required field: {field}'})
                }
        
        # Validate document links if present
        if 'documentLinks' in topic_data or 'document_links' in topic_data:
            links = topic_data.get('documentLinks') or topic_data.get('document_links')
            if not isinstance(links, list):
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Document links must be an array'})
                }
            for link in links:
                is_valid, error = validate_document_link(link)
                if not is_valid:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': error})
                    }
        
        # Generate unique ID and timestamps
        topic_id = str(uuid.uuid4())
        current_time = datetime.utcnow().isoformat()
        
        # Prepare item for DynamoDB
        # Normalize document links to objects with name and url.
        raw_links = topic_data.get('documentLinks') or topic_data.get('document_links') or []
        normalized_links = []
        for link in raw_links:
            if isinstance(link, dict):
                url = link.get('url') or ''
                name = link.get('name') or generate_name_from_url(url)
                if url:
                    normalized_links.append({'name': name, 'url': url})
            elif isinstance(link, str):
                if link:
                    normalized_links.append({'name': generate_name_from_url(link), 'url': link})

        # Handle AI content (consolidated JSON)
        ai_content = topic_data.get('aiContent') or topic_data.get('ai_content') or {}
        
        item = {
            'id': topic_id,
            'name': topic_data['name'],
            'description': topic_data.get('description', ''),
            'document_links': normalized_links,
            'ai_content': ai_content,
            'subject_id': topic_data['subject_id'],
            'school_id': topic_data['school_id'],
            'class_id': topic_data['class_id'],
            'created_at': current_time,
            'updated_at': current_time
        }
        
        # Save to DynamoDB
        table.put_item(Item=item)
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(item, cls=DecimalEncoder)
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

def get_topic(table, topic_id):
    """Get a single topic by ID"""
    try:
        response = table.get_item(Key={'id': topic_id})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Topic not found'})
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response['Item'], cls=DecimalEncoder)
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

def get_topics_by_subject(table, subject_id):
    """Get all topics for a specific subject"""
    try:
        # Queries on GSIs are eventually consistent. Add a brief retry to avoid
        # transient empty reads right after a write, then fall back to a scan filter
        # for small datasets in edge cases.
        items = []
        last_exception = None
        for attempt in range(3):
            try:
                response = table.query(
                    IndexName='school-class-subject-index',
                    KeyConditionExpression=boto3.dynamodb.conditions.Key('subject_id').eq(subject_id)
                )
                items = response.get('Items', [])
                if items:
                    break
                # Backoff: 100ms, 200ms, 300ms
                time.sleep(0.1 * (attempt + 1))
            except Exception as e:
                last_exception = e
                time.sleep(0.1 * (attempt + 1))

        # Fallback: scan with filter if still empty and we had no hard error
        if not items:
            try:
                scan_resp = table.scan(
                    FilterExpression=boto3.dynamodb.conditions.Attr('subject_id').eq(subject_id)
                )
                items = scan_resp.get('Items', [])
            except Exception as e:
                last_exception = e
                # If scan also fails, raise the last exception
                raise last_exception

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(items, cls=DecimalEncoder)
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

def get_all_topics(table):
    """Get all topics"""
    try:
        response = table.scan()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response['Items'], cls=DecimalEncoder)
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

def update_topic(table, topic_id, update_data):
    """Update an existing topic"""
    try:
        print(f"DEBUG: update_topic called with topic_id: {topic_id}")
        print(f"DEBUG: update_data: {update_data}")
        print(f"DEBUG: aiContent in update_data: {update_data.get('aiContent', 'NOT_FOUND')}")
        if 'aiContent' in update_data:
            ai_content = update_data['aiContent']
            print(f"DEBUG: aiContent type: {type(ai_content)}")
            print(f"DEBUG: aiContent keys: {list(ai_content.keys()) if isinstance(ai_content, dict) else 'Not a dict'}")
            print(f"DEBUG: teachingGuide in aiContent: {'teachingGuide' in ai_content if isinstance(ai_content, dict) else 'N/A'}")
            print(f"DEBUG: images in aiContent: {'images' in ai_content if isinstance(ai_content, dict) else 'N/A'}")
        # Check if topic exists
        existing_response = table.get_item(Key={'id': topic_id})
        if 'Item' not in existing_response:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Topic not found'})
            }
        
        # Validate document links if present
        if 'documentLinks' in update_data or 'document_links' in update_data:
            links = update_data.get('documentLinks') or update_data.get('document_links')
            if not isinstance(links, list):
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Document links must be an array'})
                }
            for link in links:
                is_valid, error = validate_document_link(link)
                if not is_valid:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': error})
                    }
        
        # Prepare update expression with expression attribute names for reserved keywords
        update_expression = "SET updated_at = :updated_at"
        expression_values = {':updated_at': datetime.utcnow().isoformat()}
        expression_names = {}
        
        # Add fields to update
        updatable_fields = ['name', 'description', 'document_links', 'ai_content']
        field_mapping = {
            'documentLinks': 'document_links',
            'document_links': 'document_links',
            'aiContent': 'ai_content',
            'ai_content': 'ai_content'
        }
        
        # Reserved keywords that need expression attribute names
        reserved_keywords = ['name', 'description', 'summary']
        
        for field in updatable_fields:
            frontend_field = field
            # Check for field name mapping
            for frontend_name, backend_name in field_mapping.items():
                if backend_name == field and frontend_name in update_data:
                    frontend_field = frontend_name
                    break
            
            if frontend_field in update_data:
                # Normalize document links to array of {name,url}
                value = update_data[frontend_field]
                if field == 'document_links':
                    norm = []
                    for link in (value or []):
                        if isinstance(link, dict):
                            url = link.get('url') or ''
                            name = link.get('name') or generate_name_from_url(url)
                            if url:
                                norm.append({'name': name, 'url': url})
                        elif isinstance(link, str):
                            if link:
                                norm.append({'name': generate_name_from_url(link), 'url': link})
                    value = norm
                
                # Use expression attribute names for reserved keywords
                if field in reserved_keywords:
                    attr_name = f"#{field}"
                    expression_names[attr_name] = field
                    update_expression += f", {attr_name} = :{field}"
                else:
                    update_expression += f", {field} = :{field}"
                
                expression_values[f':{field}'] = value
        
        # Perform update
        update_params = {
            'Key': {'id': topic_id},
            'UpdateExpression': update_expression,
            'ExpressionAttributeValues': expression_values,
            'ReturnValues': "ALL_NEW"
        }
        
        # Only add ExpressionAttributeNames if we have reserved keywords
        if expression_names:
            update_params['ExpressionAttributeNames'] = expression_names
        
        response = table.update_item(**update_params)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response['Attributes'], cls=DecimalEncoder)
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

def delete_topic(table, topic_id):
    """Delete a topic"""
    try:
        # Check if topic exists
        existing_response = table.get_item(Key={'id': topic_id})
        if 'Item' not in existing_response:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Topic not found'})
            }
        
        # Delete the topic
        table.delete_item(Key={'id': topic_id})
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Topic deleted successfully'})
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