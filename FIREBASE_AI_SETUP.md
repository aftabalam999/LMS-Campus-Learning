# Firebase Cloud Functions AI Feedback Setup

## Overview
This solution uses Firebase Cloud Functions to provide AI feedback that works on your deployed Firebase site. It tries multiple AI services with automatic fallback to rule-based feedback.

## Features
- ✅ **Works on deployed sites** - No local servers needed
- ✅ **Multiple AI providers** - Hugging Face + OpenAI with fallback
- ✅ **Free tier available** - Hugging Face has free API calls
- ✅ **Automatic fallback** - Always provides feedback even if AI fails
- ✅ **Same API** - Drop-in replacement for existing feedback system

## Setup Steps

### 1. Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### 2. Initialize Firebase Functions (if not already done)
```bash
cd /Users/mubinmac/Documents/Codespace/Campus Learning Dashboard
firebase init functions
# Select your existing project
# Choose TypeScript (recommended)
```

### 3. Install Dependencies
```bash
cd functions
npm install axios cors
```

### 4. Get API Keys

#### Option A: Hugging Face (Free Tier - Recommended)
1. Go to [Hugging Face Settings](https://huggingface.co/settings/tokens)
2. Create a new token with "Read" permissions
3. Set the environment variable:
```bash
firebase functions:config:set huggingface.key="your_huggingface_token"
```

#### Option B: OpenAI (Free Credits for New Users)
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Set the environment variable:
```bash
firebase functions:config:set openai.key="your_openai_api_key"
```

### 5. Deploy the Function
```bash
firebase deploy --only functions:smartFeedback
```

### 6. Update Your Frontend API Calls

Change your API endpoint from:
```javascript
// Old (local server)
const response = await fetch('http://localhost:4001/api/smart-feedback', {

// New (Firebase Functions)
const response = await fetch('https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/smartFeedback', {
```

Or update your environment variables:
```env
# Add to .env
REACT_APP_FEEDBACK_API_URL=https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/smartFeedback
```

## API Response Format

The function returns the same format as before:
```json
{
  "feedback": "AI-generated feedback text",
  "provider": "huggingface|openai|rule-based",
  "timestamp": "2025-10-09T...",
  "error": "optional error message"
}
```

## Cost Structure

### Free Options:
- **Hugging Face**: 1,000-5,000 free API calls per month
- **OpenAI**: $5 free credits for new users
- **Rule-based fallback**: Always free

### Paid Options:
- **Hugging Face**: $0.0005 per request after free tier
- **OpenAI**: $0.002 per 1K tokens (very cheap)

## Testing

### Local Testing:
```bash
firebase functions:shell
smartFeedback({goalText: "Test goal", context: "Test context"})
```

### Deployed Testing:
```bash
curl -X POST https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/smartFeedback \
  -H "Content-Type: application/json" \
  -d '{"goalText": "Complete HTML homepage", "context": "Phase 1"}'
```

## Monitoring

Check function logs:
```bash
firebase functions:log
```

## Benefits

1. **Scalable**: Automatically scales with your app usage
2. **Secure**: API keys stored securely in Firebase config
3. **Reliable**: Multiple fallback options ensure feedback is always available
4. **Cost-effective**: Free tier covers most small applications
5. **Deployed**: Works on your live Firebase site

## Troubleshooting

### Function not deploying:
- Check Firebase project permissions
- Ensure billing is enabled (required for Cloud Functions)
- Verify API keys are set correctly

### API returning fallback feedback:
- Check API key validity
- Monitor Firebase function logs for errors
- Verify network connectivity to external APIs

### CORS errors:
- CORS is handled automatically in the function
- Check that your domain is allowed in Firebase console</content>
<parameter name="filePath">/Users/mubinmac/Documents/Codespace/Campus Learning Dashboard/FIREBASE_AI_SETUP.md