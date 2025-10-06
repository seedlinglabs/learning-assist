# DeepSeek API Integration

## Overview
Added DeepSeek API support to the Gemini Lambda function alongside existing Gemini and Claude APIs.

## Changes Made

### 1. API Configuration
- Added `DEEPSEEK_API_KEY` environment variable
- Added `DEEPSEEK_API_BASE_URL` constant
- Updated API key validation to include DeepSeek

### 2. Supported Models
Added DeepSeek models to `SUPPORTED_MODELS`:
- `deepseek-chat`: General purpose chat model
- `deepseek-coder`: Code-focused model

### 3. New Functions

#### `handle_deepseek_request()`
- Handles DeepSeek API requests
- Converts Gemini format to DeepSeek format
- Converts DeepSeek response back to Gemini format
- Includes error handling and timeout management
- Tracks token usage for billing

#### `convert_gemini_to_deepseek_format()`
- Converts Gemini API request format to DeepSeek format
- Maps generation config parameters (max_tokens, temperature)
- **Validates max_tokens range [1, 8192]** - clamps values outside this range
- Handles message format conversion
- Includes logging for parameter validation

#### `convert_deepseek_to_gemini_format()`
- Converts DeepSeek API response to Gemini format
- Maps finish reasons (length → MAX_TOKENS, stop → STOP)
- Extracts token usage information

### 4. Updated Router
Modified `handle_ai_proxy()` to route DeepSeek models to the new handler.

### 5. Universal Parameter Validation
Applied max_tokens validation to all AI providers:
- **Gemini**: Validates maxOutputTokens in generationConfig
- **Claude**: Validates max_tokens in request body
- **DeepSeek**: Validates max_tokens in request body
- All providers clamp values to range [1, 8192]
- Warning logs when values are clamped

## Environment Variables Required

Add to your Lambda environment variables:
```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

## API Usage

### Request Format
Same as existing Gemini/Claude requests, just specify the model:

```json
{
  "model": "deepseek-chat",
  "contents": [
    {
      "role": "user",
      "parts": [{"text": "Hello, how are you?"}]
    }
  ],
  "generationConfig": {
    "maxOutputTokens": 1000,
    "temperature": 0.7
  }
}
```

### Response Format
Returns the same Gemini-compatible format as other providers.

## Supported Endpoints
All existing endpoints work with DeepSeek:
- `generate-content`
- `discover-documents`
- `enhance-section`
- `analyze-chapter`

## Error Handling
- API key validation
- Request timeout handling (80s limit)
- Network error handling
- Rate limiting (same as other providers)
- **Parameter validation**: max_tokens clamped to valid range [1, 8192] for all providers
- **Logging**: Parameter validation warnings and request details
- **Universal fix**: Applied max_tokens validation to Gemini, Claude, and DeepSeek

## Token Usage Tracking
DeepSeek token usage is tracked in the same DynamoDB table as other providers, using the format:
- `{endpoint_name}-{model}` as the operation key
- Combined prompt + completion tokens as usage count

## Testing
Test with any existing client by changing the model parameter to `deepseek-chat` or `deepseek-coder`.
