#!/usr/bin/env python3

import sys
import os

print("Python version:", sys.version)
print("Python path:", sys.path)

try:
    import jwt
    print("✅ JWT import successful")
    print("JWT version:", jwt.__version__)
    print("JWT module path:", jwt.__file__)
except ImportError as e:
    print("❌ JWT import failed:", e)

try:
    import PyJWT
    print("✅ PyJWT import successful")
    print("PyJWT version:", PyJWT.__version__)
    print("PyJWT module path:", PyJWT.__file__)
except ImportError as e:
    print("❌ PyJWT import failed:", e)

# Test JWT functionality
try:
    import jwt
    secret = "test-secret"
    payload = {"user_id": "test", "exp": 9999999999}
    token = jwt.encode(payload, secret, algorithm="HS256")
    print("✅ JWT encode successful:", token)
    
    decoded = jwt.decode(token, secret, algorithms=["HS256"])
    print("✅ JWT decode successful:", decoded)
except Exception as e:
    print("❌ JWT functionality test failed:", e)
