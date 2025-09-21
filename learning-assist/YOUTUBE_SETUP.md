# YouTube API Setup Guide

This guide explains how to set up the YouTube Data API v3 to enable real video search functionality.

## Prerequisites

- Google Cloud Platform account
- YouTube Data API v3 enabled

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable YouTube Data API v3

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "YouTube Data API v3"
3. Click on it and press "Enable"

### 3. Create API Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key
4. (Optional) Restrict the API key to YouTube Data API v3 for security

### 4. Set Environment Variable

Create a `.env` file in your project root (if it doesn't exist) and add:

```bash
REACT_APP_YOUTUBE_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with the actual API key from step 3.

### 5. Restart Development Server

After adding the environment variable, restart your React development server:

```bash
npm start
```

## API Quotas

- **Free Tier**: 10,000 units per day
- **Search**: 100 units per request
- **Video Details**: 1 unit per request

This means you can make approximately 100 video searches per day on the free tier.

## Troubleshooting

### Common Issues

1. **"YouTube API key not configured" error**
   - Make sure the environment variable is set correctly
   - Restart the development server after adding the variable

2. **"YouTube API error: 403" error**
   - Check if the API key is valid
   - Ensure YouTube Data API v3 is enabled
   - Verify the API key has proper permissions

3. **"YouTube API error: 429" error**
   - You've exceeded the daily quota
   - Wait 24 hours or upgrade to a paid plan

### Testing the Setup

1. Open the browser developer console
2. Try using the "Enhance" button on a topic
3. Check for any error messages in the console
4. Verify that real YouTube video links are generated

## Security Notes

- Never commit the `.env` file to version control
- Consider restricting the API key to specific domains in production
- Monitor API usage in the Google Cloud Console

## Fallback Behavior

If the YouTube API is not configured or fails, the system will fall back to:
- Generic video search suggestions
- Educational resource recommendations
- Teaching activity suggestions

This ensures the "Enhance" functionality always works, even without YouTube integration.
