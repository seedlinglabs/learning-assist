#!/usr/bin/env python3
"""
Simple JWT implementation without external dependencies
This is a basic implementation for testing purposes only
"""

import json
import base64
import hmac
import hashlib
import time

def base64url_encode(data):
    """Base64 URL encode without padding"""
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data):
    """Base64 URL decode with padding"""
    # Add padding if needed
    missing_padding = len(data) % 4
    if missing_padding:
        data += '=' * (4 - missing_padding)
    return base64.urlsafe_b64decode(data)

def encode(payload, secret, algorithm='HS256'):
    """Encode a JWT token"""
    if algorithm != 'HS256':
        raise ValueError('Only HS256 algorithm is supported')
    
    # Create header
    header = {
        "alg": algorithm,
        "typ": "JWT"
    }
    
    # Encode header and payload
    header_encoded = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_encoded = base64url_encode(json.dumps(payload).encode('utf-8'))
    
    # Create signature
    message = f"{header_encoded}.{payload_encoded}".encode('utf-8')
    signature = hmac.new(
        secret.encode('utf-8'),
        message,
        hashlib.sha256
    ).digest()
    signature_encoded = base64url_encode(signature)
    
    return f"{header_encoded}.{payload_encoded}.{signature_encoded}"

def decode(token, secret, algorithms=['HS256']):
    """Decode and verify a JWT token"""
    if 'HS256' not in algorithms:
        raise ValueError('Only HS256 algorithm is supported')
    
    try:
        # Split token
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError('Invalid token format')
        
        header_encoded, payload_encoded, signature_encoded = parts
        
        # Decode header and payload
        header = json.loads(base64url_decode(header_encoded))
        payload = json.loads(base64url_decode(payload_encoded))
        
        # Verify signature
        message = f"{header_encoded}.{payload_encoded}".encode('utf-8')
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            message,
            hashlib.sha256
        ).digest()
        expected_signature_encoded = base64url_encode(expected_signature)
        
        if not hmac.compare_digest(signature_encoded, expected_signature_encoded):
            raise ValueError('Invalid signature')
        
        # Check expiration if present
        if 'exp' in payload:
            if payload['exp'] < time.time():
                raise ValueError('Token has expired')
        
        return payload
        
    except Exception as e:
        raise ValueError(f'Invalid token: {str(e)}')

# Create a simple JWT module interface
class JWT:
    @staticmethod
    def encode(payload, secret, algorithm='HS256'):
        return encode(payload, secret, algorithm)
    
    @staticmethod
    def decode(token, secret, algorithms=['HS256']):
        return decode(token, secret, algorithms)
    
    class ExpiredSignatureError(Exception):
        pass
    
    class InvalidTokenError(Exception):
        pass

# Make it available as a module
jwt = JWT()
