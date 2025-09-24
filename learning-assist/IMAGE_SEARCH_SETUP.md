# Image Search Setup Guide

The image search functionality uses real image APIs to find educational images, similar to how the YouTube service works for videos.

## 🖼️ Supported Image Sources

### 1. Unsplash (Primary)
- **Free tier**: 50 requests per hour
- **Quality**: High-quality, professional photos
- **Best for**: Educational concepts, classroom activities, real-world examples

**Setup:**
1. Go to [Unsplash Developers](https://unsplash.com/developers)
2. Create a new application
3. Copy your Access Key
4. Add to `.env.local`:
   ```
   REACT_APP_UNSPLASH_ACCESS_KEY=your_access_key_here
   ```

### 2. Pexels (Backup)
- **Free tier**: 200 requests per hour
- **Quality**: Good variety of educational content
- **Best for**: Additional image variety

**Setup:**
1. Go to [Pexels API](https://www.pexels.com/api/)
2. Create an account and get API key
3. Add to `.env.local`:
   ```
   REACT_APP_PEXELS_API_KEY=your_api_key_here
   ```

## 🚀 How It Works

### Search Strategy
The service uses multiple search queries to find relevant images:

1. **Base topic query**: "Photosynthesis"
2. **Subject-specific**: "Photosynthesis Science"
3. **Grade level**: "Photosynthesis Grade 6"
4. **Educational context**: "Photosynthesis school", "Photosynthesis learning"

### Image Selection
- **Quality**: High-resolution images (800x600+)
- **Orientation**: Landscape (better for classroom display)
- **Content**: Educational and appropriate for students
- **Licensing**: Free to use for educational purposes

### Fallback Behavior
- If no API keys are provided, shows demo images
- If APIs fail, gracefully handles errors
- Removes duplicate images automatically

## 📋 Image Information Provided

Each image includes:
- **Title**: Descriptive name
- **Description**: How it supports learning
- **URL**: Direct image link
- **Source**: Unsplash/Pexels
- **Photographer**: Credit information
- **Download URL**: High-resolution version

## 🎯 Benefits Over Gemini

1. **Real Images**: Actual working URLs, not suggestions
2. **High Quality**: Professional photography
3. **Reliable**: No AI hallucination of fake URLs
4. **Fast**: Direct API calls, no complex prompts
5. **Consistent**: Same format as video search
6. **Free**: No additional AI costs

## 🔧 Configuration

### Environment Variables
Create `.env.local` in the project root:
```bash
# Image Search APIs
REACT_APP_UNSPLASH_ACCESS_KEY=your_unsplash_key
REACT_APP_PEXELS_API_KEY=your_pexels_key
```

### Demo Mode
If no API keys are provided, the service will:
- Show demo images from Unsplash
- Display "Demo" in the source field
- Work fully for testing purposes

## 🎨 Image Categories by Subject

The service automatically searches for subject-specific image categories:

- **Science**: experiment, laboratory, nature, animals, plants, space
- **Mathematics**: numbers, geometry, shapes, graphs, charts
- **English**: books, reading, writing, literature, storytelling
- **Social Studies**: history, geography, culture, government
- **Computers**: technology, coding, programming, digital

## 🚀 Usage

The image search is automatically triggered during AI content generation:

1. User clicks "Generate AI Content"
2. System generates lesson plan and teaching guide
3. **NEW**: Image search service finds real educational images
4. Images appear in the Images tab with clickable links

No additional setup required - it works out of the box! 🎉
