const { GoogleGenerativeAI } = require("@google/generative-ai");

// IMPORTANT: Replace "YOUR_API_KEY" with your actual Gemini API key
const apiKey = "AIzaSyBM6eAN3Tu41BN8KvxWSR8qeHy9SAYUngk";

async function listModels() {
  if (apiKey === "YOUR_API_KEY") {
    console.error("Please replace 'YOUR_API_KEY' with your actual Gemini API key in scripts/listModels.js");
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    // The listModels() method is not directly available on the genAI instance.
    // We need to get the generative model service and then list models.
    // This is a bit of a workaround as the SDK doesn't have a direct top-level listModels()
    // Let's try to get a model and see if we can access the service from there.
    // The documentation is not clear on this.
    // Let's try another way based on public examples.
    
    console.log("Fetching available models...");

    // The SDK doesn't seem to have a direct `listModels` function.
    // I will use a raw REST call to list the models.
    const axios = require('axios');
    const response = await axios.get('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: {
            'x-goog-api-key': apiKey
        }
    });

    const models = response.data.models;
    console.log("Available models:");
    models.forEach(model => {
      if (model.supportedGenerationMethods.includes("generateContent")) {
        console.log(`- ${model.name} (${model.displayName})`);
      }
    });

  } catch (error) {
    console.error("Error listing models:", error.response ? error.response.data : error.message);
  }
}

listModels();
