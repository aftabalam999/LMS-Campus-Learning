// Firebase Cloud Function for AI Feedback (deployed solution)
/* eslint-disable */
const functions = require('firebase-functions');
const axios = require('axios');
const cors = require('cors')({ origin: true });

// Use Hugging Face Inference API (free tier available)
const HF_API_URL = 'https://api-inference.huggingface.co/models';
const HF_API_KEY = functions.config().huggingface?.key;

// Alternative: OpenAI API (free credits for new users)
const OPENAI_API_KEY = functions.config().openai?.key;

// Fallback: Simple rule-based feedback
function generateFallbackFeedback(goalText) {
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

exports.smartFeedback = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { goalText, userId, context } = req.body;

        if (!goalText) {
            return res.status(400).json({ error: "Missing goalText" });
        }

        try {
            // Format context
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

            const prompt = `You are an expert mentor. Read the student's goal and the context.

Student goal: "${goalText}"

Context:
${formattedContext}

Respond in short Markdown only. Do NOT use section headers.
1) Provide a single short sentence (one line) that states the main thing that is incorrect or missing in the goal. Keep this one line under ~25 words.
2) Provide up to 5 concise Socratic bullet questions (each 8-20 words) that guide the student to fix the goal.
Do NOT rewrite the goal or lecture. Keep total response under 200 words.`;

            let feedback = null;
            let provider = 'fallback';

            // Try Hugging Face first (free tier)
            if (HF_API_KEY) {
                try {
                    console.log('Trying Hugging Face API...');
                    const response = await axios.post(
                        `${HF_API_URL}/microsoft/DialoGPT-medium`,
                        {
                            inputs: prompt,
                            parameters: {
                                max_length: 200,
                                temperature: 0.7,
                                do_sample: true
                            }
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${HF_API_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 15000
                        }
                    );

                    if (response.data && response.data[0] && response.data[0].generated_text) {
                        feedback = response.data[0].generated_text.replace(prompt, '').trim();
                        provider = 'huggingface';
                        console.log('Hugging Face API success');
                    }
                } catch (error) {
                    console.warn('Hugging Face API failed:', error.message);
                }
            }

            // Try OpenAI as fallback (if available)
            if (!feedback && OPENAI_API_KEY) {
                try {
                    console.log('Trying OpenAI API...');
                    const response = await axios.post(
                        'https://api.openai.com/v1/chat/completions',
                        {
                            model: 'gpt-3.5-turbo',
                            messages: [{ role: 'user', content: prompt }],
                            max_tokens: 200,
                            temperature: 0.7
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 15000
                        }
                    );

                    if (response.data && response.data.choices && response.data.choices[0]) {
                        feedback = response.data.choices[0].message.content.trim();
                        provider = 'openai';
                        console.log('OpenAI API success');
                    }
                } catch (error) {
                    console.warn('OpenAI API failed:', error.message);
                }
            }

            // Use fallback if AI services fail
            if (!feedback) {
                feedback = generateFallbackFeedback(goalText);
                provider = 'rule-based';
                console.log('Using rule-based fallback');
            }

            return res.json({
                feedback: feedback,
                provider: provider,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Smart feedback error:', error);
            // Always provide fallback feedback
            const fallbackFeedback = generateFallbackFeedback(goalText);
            return res.json({
                feedback: fallbackFeedback,
                provider: 'fallback',
                error: 'AI service temporarily unavailable',
                timestamp: new Date().toISOString()
            });
        }
    });
});</content>
<parameter name="filePath">/Users/mubinmac/Documents/Codespace/Campus Learning Dashboard/functions/smartFeedback.js