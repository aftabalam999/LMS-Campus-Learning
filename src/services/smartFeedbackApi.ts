// Express-style API handler for Gemini SMART feedback (Node.js or Firebase Functions)
import axios from 'axios';
import { Request, Response } from 'express';

interface SmartFeedbackRequest {
  goalText: string;
  apiKey: string;
}

export async function handleSmartFeedback(req: Request<{}, {}, SmartFeedbackRequest>, res: Response) {
  const { goalText, apiKey } = req.body;
  if (!goalText || !apiKey) {
    return res.status(400).json({ error: 'Missing goalText or apiKey' });
  }
  try {
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta2/models/gemini-pro:generateContent';
    const response = await axios.post(endpoint, {
      contents: [{ parts: [{ text: goalText }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 256
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    const feedback = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No feedback received.';
    return res.json({ feedback });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle Axios-specific errors
      return res.status(500).json({ 
        error: error.response?.data?.error?.message || error.message || 'Failed to get feedback from Gemini API'
      });
    }
    // Handle other types of errors
    return res.status(500).json({ 
      error: 'An unexpected error occurred'
    });
  }
}
