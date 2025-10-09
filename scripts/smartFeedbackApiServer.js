// Minimal Express server for Gemini SMART feedback
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require('firebase-admin');

// Initialize firebase-admin if not already initialized. It expects service account key via
// environment or default application credentials in your environment.
try {
    if (!admin.apps || admin.apps.length === 0) {
        admin.initializeApp();
    }
} catch (e) {
    // ignore initialization errors
}
const db = admin.firestore ? admin.firestore() : null;

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/smart-feedback", async (req, res) => {
    const { goalText, apiKey, userId, context } = req.body;

    if (!goalText) {
        return res.status(400).json({ error: "Missing goalText" });
    }

    // Resolve API key: prefer server-side stored key if userId provided, otherwise fallback to apiKey
    let resolvedApiKey = apiKey || null;
    let keySource = resolvedApiKey ? 'client-provided' : null;
    if (userId && db) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                if (data && data.gemini_api_key) {
                    resolvedApiKey = data.gemini_api_key;
                    keySource = 'firestore-stored';
                }
            }
        } catch (e) {
            console.warn('Failed to read user key from Firestore:', e.message || e);
        }
    }

    // Local development fallback: allow using a single env var GEMINI_API_KEY
    if (!resolvedApiKey && process.env.GEMINI_API_KEY) {
        resolvedApiKey = process.env.GEMINI_API_KEY;
        keySource = 'env-GEMINI_API_KEY';
    }

    if (!resolvedApiKey) {
        return res.status(400).json({ error: 'No Gemini API key available for this user. Please add one in your profile or set GEMINI_API_KEY for local development.' });
    }

    try {
        const genAI = new GoogleGenerativeAI(resolvedApiKey);
        const models = ["gemini-2.5-flash", "gemini-pro-latest", "gemini-flash-latest"];
        let feedback = "";
        let lastError = null;

        for (const modelName of models) {
            try {
                // Build a robust prompt. If `context` is a JSON string, parse and format it
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
                    // leave formattedContext as-is (plain string)
                }

                const prompt = `You are an expert mentor. Read the student's goal and the context.\n\nStudent goal: "${goalText}"\n\nContext:\n${formattedContext}\n\nRespond in short Markdown only. Do NOT use section headers.\n1) Provide a single short sentence (one line) that states the main thing that is incorrect or missing in the goal. Keep this one line under ~25 words.\n2) Provide up to 5 concise Socratic bullet questions (each 8-20 words) that guide the student to fix the goal.\nDo NOT rewrite the goal or lecture. Keep total response under 200 words.`;

                console.log(`Trying model ${modelName}...`);
                console.log("Sending prompt to Gemini API:", prompt);
                console.log(`Using API key source: ${keySource || 'unknown'}`);

                // Use getGenerativeModel to obtain a model instance and call generateContent
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent({
                    contents: [ { role: 'user', parts: [ { text: prompt } ] } ]
                });

                // The SDK may return the content in multiple shapes. Try several options.
                // 1) result may include candidates -> content -> text
                if (result?.candidates?.[0]?.content?.[0]?.text) {
                    feedback = result.candidates[0].content[0].text;
                } else if (result?.output?.[0]?.content?.[0]?.text) {
                    feedback = result.output[0].content[0].text;
                } else if (result?.response) {
                    // Some SDKs wrap final response in a `response` promise/object
                    try {
                        const resp = await result.response;
                        if (resp) {
                            if (typeof resp.text === 'function') {
                                feedback = resp.text();
                            } else if (resp?.candidates?.[0]?.content?.[0]?.text) {
                                feedback = resp.candidates[0].content[0].text;
                            } else if (resp?.output?.[0]?.content?.[0]?.text) {
                                feedback = resp.output[0].content[0].text;
                            } else {
                                feedback = JSON.stringify(resp);
                            }
                        }
                    } catch (e) {
                        // ignore
                    }
                } else if (typeof result === 'string') {
                    feedback = result;
                } else {
                    try { feedback = JSON.stringify(result); } catch (e) { feedback = ''; }
                }
                if (feedback) {
                    break; // Success, exit loop
                }
            } catch (error) {
                lastError = error;
                console.error(`Model ${modelName} failed:`, error.message);
                // If the error is 503 or 404, we'll try the next model.
                if (error.message.includes("503") || error.message.includes("404")) {
                    continue;
                } else {
                    // For other errors, we might not want to retry.
                    break;
                }
            }
        }

        if (feedback) {
            return res.json({ feedback });
        } else {
            throw lastError || new Error("All models failed to generate feedback.");
        }

    } catch (error) {
        console.error("Error details:", error.message);
        return res.status(500).json({ 
            error: error.message || "Failed to get feedback from Gemini API" 
        });
    }
});

// Validate stored API key for a user (quick lightweight check)
app.post('/api/validate-key', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    let resolvedApiKey = null;
    if (db) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                if (data && data.gemini_api_key) {
                    resolvedApiKey = data.gemini_api_key;
                }
            }
        } catch (e) {
            console.warn('Failed to read user key from Firestore for validate:', e.message || e);
        }
    }

    if (!resolvedApiKey) return res.status(400).json({ valid: false, error: 'No stored API key found' });

    try {
        const genAI = new GoogleGenerativeAI(resolvedApiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        // lightweight prompt that shouldn't cost much
        const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'Say OK' }] }] });
        // if we get any response text, we consider the key valid
        let text = null;
        if (result?.candidates?.[0]?.content?.[0]?.text) text = result.candidates[0].content[0].text;
        else if (result?.output?.[0]?.content?.[0]?.text) text = result.output[0].content[0].text;
        else if (typeof result === 'string') text = result;

        if (text) {
            return res.json({ valid: true });
        }
        return res.status(502).json({ valid: false, error: 'No response from model' });
    } catch (e) {
        console.warn('validate-key error:', e.message || e);
        return res.status(502).json({ valid: false, error: e.message || String(e) });
    }
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
    console.log(`SMART Feedback API server running on port ${PORT}`);
});
