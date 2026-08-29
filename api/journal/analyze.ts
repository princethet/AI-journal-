import { GoogleGenAI, Type } from '@google/genai';

const MODEL_FALLBACK_LADDER = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-pro'
];

async function generateContentWithFallback(ai: GoogleGenAI, params: {
  contents: unknown;
  config?: Record<string, unknown>;
}) {
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
      console.warn(`[Vercel Gemini Fallback] Model ${modelName} failed:`, err?.message || err);
      lastError = err;
      const status = err?.status || err?.statusCode || (err?.response && err.response.status);
      const isRecoverable = !status || [404, 429, 500, 503, 504].includes(status);
      if (!isRecoverable && status === 400 && !err.message?.includes('model')) {
        throw err;
      }
    }
  }
  throw lastError || new Error('All fallback models exhausted');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const { title = 'Untitled Reflection', content = '', conversation = [] } = data;

    if (!content && (!Array.isArray(conversation) || conversation.length === 0)) {
      return res.status(400).json({ error: 'Journal content or conversation is required for analysis' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    const ai = new GoogleGenAI({ apiKey });

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

    const { response, modelUsed } = await generateContentWithFallback(ai, {
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
              description: 'Numerical sentiment polarity from -1.0 to +1.0',
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 5 concise thematic topic tags',
            },
            summary: {
              type: Type.STRING,
              description: '1 to 2 sentence synthesis of the reflection',
            },
            growthTakeaway: {
              type: Type.STRING,
              description: 'One constructive, actionable insight for personal growth',
            },
            energyLevel: {
              type: Type.STRING,
              enum: ['Low', 'Medium', 'High'],
              description: 'The overall mental and physical energy level',
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

    return res.status(200).json({
      ...parsedResult,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Vercel API error in /api/journal/analyze:', error);
    return res.status(500).json({
      error: 'Failed to extract metadata from journal entry',
      message: error?.message || 'Unknown serverless error',
    });
  }
}
