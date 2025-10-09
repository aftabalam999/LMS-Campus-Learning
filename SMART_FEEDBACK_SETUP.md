Local dev setup for SMART Feedback server and Gemini API keys

1) Using a per-user Firestore-stored Gemini key (recommended for production)
- Create a Google Cloud service account with Firestore access and download the JSON key file.
- On your local machine, set the environment variable:
  export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
- Start the server. The Express server will attempt to read the user's gemini_api_key from Firestore at `users/<userId>.gemini_api_key`.

2) Local development fallback (convenient for quick testing)
- You can set a single GEMINI API key for local development. This avoids needing Firestore credentials.
  export GEMINI_API_KEY="your_gemini_api_key_here"
- The server will prefer Firestore-stored keys when available, otherwise it will use the `GEMINI_API_KEY` env var.

3) Notes and security
- Never commit service account keys or API keys to source control.
- In production, prefer secure secrets storage (Secret Manager) and restrict Firestore access via rules and IAM.
- Keep the key lifecycle short and rotate keys periodically.
