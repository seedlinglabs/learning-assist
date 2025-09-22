import json
import sys
import os

def lambda_handler(event, context):
    """Debug Lambda function to test JWT import"""
    
    result = {
        "python_version": sys.version,
        "python_path": sys.path,
        "cwd": os.getcwd(),
        "files_in_cwd": os.listdir('.'),
        "jwt_import_status": "unknown"
    }
    
    try:
        import jwt
        result["jwt_import_status"] = "success"
        result["jwt_version"] = jwt.__version__
        result["jwt_file"] = jwt.__file__
        
        # Test JWT functionality
        secret = "test-secret"
        payload = {"user_id": "test", "exp": 9999999999}
        token = jwt.encode(payload, secret, algorithm="HS256")
        result["jwt_encode_test"] = "success"
        result["test_token"] = token
        
        decoded = jwt.decode(token, secret, algorithms=["HS256"])
        result["jwt_decode_test"] = "success"
        result["decoded_payload"] = decoded
        
    except ImportError as e:
        result["jwt_import_status"] = "failed"
        result["jwt_import_error"] = str(e)
    except Exception as e:
        result["jwt_import_status"] = "success_but_error"
        result["jwt_error"] = str(e)
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(result, indent=2)
    }
