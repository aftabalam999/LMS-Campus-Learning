# Free AI Feedback Server Setup Guide

## Option 1: Ollama (Completely Free, Local AI) ⭐ Recommended

### What is Ollama?
Ollama runs AI models locally on your machine - no API keys, no cloud costs, completely free!

### Installation & Setup

1. **Download and Install Ollama:**
   ```bash
   # macOS
   curl -fsSL https://ollama.ai/install.sh | sh

   # Or download from: https://ollama.ai/download
   ```

2. **Install a Model:**
   ```bash
   # Install a good general-purpose model
   ollama pull llama2          # Fast, good quality
   ollama pull mistral         # Alternative option
   ollama pull codellama       # Code-focused model
   ```

3. **Start Ollama Service:**
   ```bash
   ollama serve
   ```
   This runs on `http://localhost:11434` by default.

4. **Run the Free Feedback Server:**
   ```bash
   cd /path/to/your/project
   node scripts/freeFeedbackApiServer.js
   ```

### Configuration
Set environment variables to customize:
```bash
export OLLAMA_MODEL="llama2"          # Change model
export OLLAMA_BASE_URL="http://localhost:11434"  # If running on different port
export PORT=4001                      # Server port
```

### Testing
Check server health: `http://localhost:4001/api/health`

## Option 2: Hugging Face Inference API (Free Tier)

### Setup
1. Get free API token from [Hugging Face](https://huggingface.co/settings/tokens)
2. Set environment variable:
   ```bash
   export HF_API_KEY="your_huggingface_token"
   ```
3. Use the server with Hugging Face instead of Ollama

*(Note: Limited free requests per month)*

## Option 3: OpenAI Free Credits (For New Users)

### Setup
1. Create OpenAI account at [platform.openai.com](https://platform.openai.com)
2. Get API key (new users get free credits)
3. Set environment variable:
   ```bash
   export OPENAI_API_KEY="your_openai_key"
   ```

## Option 4: No AI - Rule-Based Feedback Only

If you don't want any AI at all, the server includes automatic fallback to simple rule-based feedback that checks for basic SMART goal criteria.

## Running the Server

```bash
# Using Ollama (recommended)
node scripts/freeFeedbackApiServer.js

# Using Hugging Face
export HF_API_KEY="your_key"
node scripts/freeFeedbackApiServer.js

# Using OpenAI
export OPENAI_API_KEY="your_key"
node scripts/freeFeedbackApiServer.js
```

## Features

- **Same API**: Uses the same `/api/smart-feedback` endpoint as the original
- **Automatic Fallback**: If AI fails, provides basic rule-based feedback
- **Health Check**: Monitor server and AI service status
- **Multiple Models**: Support for different AI models
- **Local First**: Ollama keeps everything on your machine

## Dependencies Needed

Add to your `package.json` if not already present:
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "axios": "^1.6.0"
  }
}
```

## Why Ollama?

- ✅ **Completely Free** - No API costs ever
- ✅ **Privacy** - All processing stays on your machine
- ✅ **Fast** - Once model is loaded, responses are quick
- ✅ **Offline** - Works without internet after setup
- ✅ **Flexible** - Choose from hundreds of models</content>
<parameter name="filePath">/Users/mubinmac/Documents/Codespace/Campus Learning Dashboard/FREE_AI_SETUP.md