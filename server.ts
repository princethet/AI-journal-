import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Mandatory Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lazy initialization of Google Gen AI client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. API calls will fail or rely on fallback.');
    }
    genAIClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return genAIClient;
}

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-pro'
];

/**
 * Standard Helper with Resilient Model Fallback Ladder & Error Recovery Matrix
 */
async function generateContentWithFallback(params: {
  contents: unknown;
  config?: Record<string, unknown>;
}) {
  const ai = getGenAI();
  let lastError: unknown = null;

  for (const modelName of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: params.contents as any,
        config: params.config as any,
      });
      return { response, modelUsed: modelName };
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model ${modelName} failed. Reason: ${err?.message || err}. Attempting next ladder model...`);
      lastError = err;
      // Recoverable error check: continue to next fallback
      const status = err?.status || err?.statusCode || (err?.response && err.response.status);
      const isRecoverable = !status || [404, 429, 500, 503, 504].includes(status);
      if (!isRecoverable && status === 400 && !err.message?.includes('model')) {
        // Validation issue on payload rather than model availability
        throw err;
      }
    }
  }

  throw lastError || new Error('All fallback models in the Gemini resilience ladder exhausted.');
}

// ==========================================
// API ROUTES
// ==========================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

/**
 * 1. Conversational Journaling & AI Coaching Endpoint
 * Takes multi-turn messages and returns empathetic coaching reflection
 */
app.post('/api/chat/coach', async (req, res) => {
  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const { messages = [], currentEntry = '', journalTopic = '' } = data;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Format chat history into Gemini contents format
    const contents = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(msg.content || '') }],
    }));

    const systemInstruction = `You are ReflectAI, an empathetic, insightful, and constructive reflection coach and conversational journaling mentor.
Your role is to guide the user in deepening their self-awareness, identifying cognitive patterns, validating genuine emotions, reframing obstacles with growth mindset, and uncovering underlying values.

Guidelines:
1. Warmth & Attunement: Acknowledge and validate the user's feelings without toxic positivity or dismissive clichés.
2. Socratic Guidance: Respond with 2-4 sentences of deep reflection followed by ONE powerful, open-ended question that prompts introspection.
3. Tone: Compassionate, calm, grounded, and non-judgmental.
4. Boundaries: Never diagnose mental illnesses or provide clinical psychiatric prescriptions. If user exhibits extreme distress, gently suggest professional human care while remaining compassionate.
${currentEntry ? `Current Journal Draft Context:\n"${currentEntry}"\n` : ''}
${journalTopic ? `Focus Topic: ${journalTopic}\n` : ''}`;

    const { response, modelUsed } = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || 'I hear you. What felt most significant about that moment for you?';
    return res.json({ reply, modelUsed });
  } catch (error: any) {
    console.error('Error in /api/chat/coach:', error);
    return res.status(500).json({
      error: 'Failed to generate AI coaching response',
      message: error?.message || 'Unknown server error',
    });
  }
});

/**
 * 2. Automated AI Metadata Extraction Endpoint
 * Uses structured JSON schema output to extract mood, score, tags, summary, growth takeaway
 */
app.post('/api/journal/analyze', async (req, res) => {
  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const { title = 'Untitled Reflection', content = '', conversation = [] } = data;

    if (!content && conversation.length === 0) {
      return res.status(400).json({ error: 'Journal content or conversation is required for analysis' });
    }

    const conversationTranscript = Array.isArray(conversation)
      ? conversation
          .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
          .join('\n')
      : '';

    const promptText = `Analyze this user's journal reflection and conversation with their AI coach:

Title: ${title}

Journal Text:
${content}

${conversationTranscript ? `Coaching Transcript:\n${conversationTranscript}` : ''}

Please extract structured emotional and cognitive insights from this reflection.`;

    const { response, modelUsed } = await generateContentWithFallback({
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: {
              type: Type.STRING,
              enum: [
                'Reflective',
                'Anxious',
                'Grateful',
                'Motivated',
                'Peaceful',
                'Challenged',
                'Joyful',
                'Overwhelmed',
                'Empowered',
              ],
              description: 'Primary mood or emotional state of the entry',
            },
            sentimentScore: {
              type: Type.NUMBER,
              description: 'Numerical sentiment polarity from -1.0 (very negative/distressed) to +1.0 (very positive/grateful/peaceful)',
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 5 concise thematic topic tags (e.g. Career, Mindfulness, Relationships, Health, Creativity, Productivity, Family)',
            },
            summary: {
              type: Type.STRING,
              description: '1 to 2 sentence high-level synthesis of what happened and how the user felt',
            },
            growthTakeaway: {
              type: Type.STRING,
              description: 'One constructive, actionable insight or reframing for future personal growth',
            },
            energyLevel: {
              type: Type.STRING,
              enum: ['Low', 'Medium', 'High'],
              description: 'The overall mental and physical energy level expressed in the writing',
            },
          },
          required: ['sentiment', 'sentimentScore', 'tags', 'summary', 'growthTakeaway', 'energyLevel'],
        },
      },
    });

    let parsedResult;
    try {
      parsedResult = JSON.parse(response.text || '{}');
    } catch {
      parsedResult = {
        sentiment: 'Reflective',
        sentimentScore: 0.2,
        tags: ['Reflection', 'Self-Awareness', 'Mindfulness'],
        summary: 'A thoughtful reflection on personal thoughts and recent experiences.',
        growthTakeaway: 'Taking time to pause and write creates space for emotional clarity and self-compassion.',
        energyLevel: 'Medium',
      };
    }

    return res.json({
      ...parsedResult,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/journal/analyze:', error);
    return res.status(500).json({
      error: 'Failed to extract metadata from journal entry',
      message: error?.message || 'Unknown server error',
    });
  }
});

/**
 * 3. Automated Weekly Digest Aggregation Endpoint
 * Synthesizes 7-day entries into executive takeaways, recurring themes, and prompts
 */
app.post('/api/journal/weekly-digest', async (req, res) => {
  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const { entries = [], startDate = '', endDate = '' } = data;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'At least one journal entry from the past 7 days is required' });
    }

    const formattedEntries = entries
      .map((entry: any, idx: number) => {
        return `[Entry ${idx + 1}] Date: ${entry.dateStr || 'Recent'} | Title: ${entry.title || 'Untitled'} | Mood: ${entry.mood || 'Reflective'} (Energy: ${entry.energyLevel || 'Medium'})
Tags: ${(entry.tags || []).join(', ')}
Content Snippet: ${(entry.content || '').slice(0, 300)}
Takeaway: ${entry.growthTakeaway || 'None provided'}`;
      })
      .join('\n\n');

    const promptText = `Here are the journal entries logged by the user across the past 7 days (${startDate} to ${endDate}):

${formattedEntries}

Please generate a comprehensive, structured Weekly Reflection Digest that highlights emotional patterns, key milestones, recurring challenges, and actionable growth exercises for the coming week.`;

    const { response, modelUsed } = await generateContentWithFallback({
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: {
              type: Type.STRING,
              description: 'A 2-3 paragraph supportive synthesis of the week’s overarching emotional and mental journey',
            },
            keyThemes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 5 core themes that dominated the user’s thoughts this week',
            },
            growthHighlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 4 specific victories, breakthroughs, or moments of gratitude and resilience',
            },
            recurringPatterns: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 3 cognitive or emotional triggers / habits observed across the entries',
            },
            actionablePrompts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 tailored journal prompts or mindfulness challenges designed for the user to explore next week',
            },
          },
          required: ['executiveSummary', 'keyThemes', 'growthHighlights', 'recurringPatterns', 'actionablePrompts'],
        },
      },
    });

    let digestData;
    try {
      digestData = JSON.parse(response.text || '{}');
    } catch {
      digestData = {
        executiveSummary: 'This week demonstrated consistent self-reflection and a dedication to personal growth.',
        keyThemes: ['Mindfulness', 'Personal Growth', 'Work-Life Balance'],
        growthHighlights: ['Maintained consistent reflective habits', 'Showed resilience during moments of stress'],
        recurringPatterns: ['Higher mental clarity following focused journaling sessions'],
        actionablePrompts: ['What is one small boundary you can set this week to protect your energy?'],
      };
    }

    return res.json({
      ...digestData,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/journal/weekly-digest:', error);
    return res.status(500).json({
      error: 'Failed to generate weekly digest',
      message: error?.message || 'Unknown server error',
    });
  }
});

// ==========================================
// Vite Middleware & Static Serving Setup
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReflectAI server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
