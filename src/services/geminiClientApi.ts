// Client-side Gemini API integration (no server needed)
import axios from 'axios';

interface SmartFeedbackRequest {
  goalText: string;
  apiKey: string;
  context?: any;
}

interface SmartFeedbackResponse {
  feedback: string;
  provider: string;
  error?: string;
}

// Fallback feedback when API fails
function generateFallbackFeedback(goalText: string): string {
  const feedback = [];
  const goal = goalText.toLowerCase();

  // Check for SMART criteria basics
  if (!goal.includes('complete') && !goal.includes('finish') && !goal.includes('build') && !goal.includes('create')) {
    feedback.push("Consider making your goal more action-oriented with specific outcomes.");
  }

  if (!goal.includes('hour') && !goal.includes('minute') && !goal.includes('page') && !/\d+/.test(goal)) {
    feedback.push("Add measurable criteria to track your progress.");
  }

  // Add some helpful questions
  feedback.push("• What specific steps will you take to achieve this?");
  feedback.push("• How will you know when you've completed it?");
  feedback.push("• What resources or help do you need?");

  return feedback.join('\n\n');
}

export async function getSmartFeedback({
  goalText,
  apiKey,
  context
}: SmartFeedbackRequest): Promise<SmartFeedbackResponse> {

  if (!goalText) {
    throw new Error('Goal text is required');
  }

  // If no API key, use fallback immediately
  if (!apiKey) {
    return {
      feedback: generateFallbackFeedback(goalText),
      provider: 'fallback',
      error: 'No API key provided'
    };
  }

  // Basic validation of API key format
  if (!apiKey.startsWith('AIza') || apiKey.length < 20) {
    console.warn('API key format appears invalid');
    return {
      feedback: generateFallbackFeedback(goalText),
      provider: 'fallback',
      error: 'Invalid API key format'
    };
  }

  // Check if it looks like a Firebase API key (but allow Gemini keys which also start with AIzaSy)
  // We'll validate by actually trying the API call instead of prefix checking

  try {
    // Format context similar to server version
    let formattedContext = context || 'No additional context provided.';
    try {
      const ctx = typeof context === 'string' ? JSON.parse(context) : context;
      if (ctx && typeof ctx === 'object') {
        const parts = [];
        if (ctx.phase) parts.push(`- Phase: ${ctx.phase}`);
        if (ctx.topic) parts.push(`- Topic: ${ctx.topic}`);
        if (ctx.description) parts.push(`- Topic Description: ${ctx.description}`);
        if (ctx.keyTags) parts.push(`- Key Tags: ${Array.isArray(ctx.keyTags) ? ctx.keyTags.join(', ') : ctx.keyTags}`);
        if (ctx.deliverable) parts.push(`- Deliverable: ${ctx.deliverable}`);
        formattedContext = parts.join('\n') || formattedContext;
      }
    } catch (e) {
      // leave formattedContext as-is
    }

    const prompt = `You are an expert programming mentor helping students create effective SMART goals. Read the student's goal and the curriculum context carefully.

Student goal: "${goalText}"

Curriculum Context:
${formattedContext}

Provide detailed, specific feedback to help the student improve their goal. Focus on making it SMART (Specific, Measurable, Achievable, Relevant, Time-bound) while considering their current curriculum phase and topic.

Structure your response in Markdown:

**Main Issue:** [One clear sentence identifying the primary problem or missing element in the goal]

**SMART Analysis:** [Briefly explain which SMART criteria (Specific/Measurable/Achievable/Relevant/Time-bound) are missing or weak, and why this matters]

**Specific Feedback:** [2-3 detailed sentences explaining why this matters for their current curriculum phase and topic, with SMART improvement suggestions]

**Guiding Questions:** [4-6 specific questions that help them refine their goal, considering the curriculum context and deliverables. Include questions that address each missing SMART element]

Keep the response focused and actionable. Reference the curriculum phase, topic, and deliverables where relevant to make the feedback more contextual. Include brief SMART goal reminders in your suggestions.`;

    // Try Gemini API with correct model names
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-pro-latest', 'gemini-flash-latest'];
    let lastError: any = null;

    for (const model of models) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        console.log(`Trying Gemini model: ${model} with endpoint: ${endpoint}`);

        const response = await axios.post(endpoint, {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 600,
            topP: 0.8,
            topK: 10
          }
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 second timeout
        });

        console.log(`Gemini model ${model} response:`, response.data);

        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          const feedback = response.data.candidates[0].content.parts[0].text.trim();
          return {
            feedback: feedback,
            provider: 'gemini'
          };
        }
      } catch (error: any) {
        console.warn(`Gemini model ${model} failed:`, error?.response?.status, error?.response?.data);
        lastError = error;
        // Continue to next model
      }
    }

    // If all models failed, throw the last error
    throw lastError || new Error('All Gemini models failed');

  } catch (error) {
    console.warn('Gemini API failed, using fallback:', error);

    // Log more details for debugging
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      console.warn('API Error Details:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        url: axiosError.config?.url
      });
    }

    // Use fallback feedback
    return {
      feedback: generateFallbackFeedback(goalText),
      provider: 'fallback',
      error: error instanceof Error ? error.message : 'API request failed'
    };
  }
}

// Helper function to validate API key
export async function validateGeminiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false;

  try {
    // Try multiple models for validation
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-pro-latest', 'gemini-flash-latest'];

    for (const model of models) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await axios.post(endpoint, {
          contents: [{
            parts: [{
              text: 'Say "OK" if you can read this.'
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10
          }
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return true;
        }
      } catch (error) {
        // Continue to next model
        continue;
      }
    }

    return false;
  } catch (error) {
    console.warn('API key validation failed:', error);
    return false;
  }
}