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
      console.warn(`[Vercel Gemini Fallback] Digest model ${modelName} failed:`, err?.message || err);
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
    const { entries = [], startDate = '', endDate = '' } = data;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'At least one journal entry is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    const ai = new GoogleGenAI({ apiKey });

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

    const { response, modelUsed } = await generateContentWithFallback(ai, {
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: {
              type: Type.STRING,
              description: 'Supportive synthesis of the week’s overarching emotional and mental journey',
            },
            keyThemes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 5 core themes that dominated the user’s thoughts',
            },
            growthHighlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 4 specific victories, breakthroughs, or resilience moments',
            },
            recurringPatterns: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 3 cognitive or emotional triggers / habits observed',
            },
            actionablePrompts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 tailored journal prompts for the coming week',
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

    return res.status(200).json({
      ...digestData,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Vercel API error in /api/journal/weekly-digest:', error);
    return res.status(500).json({
      error: 'Failed to generate weekly digest',
      message: error?.message || 'Unknown serverless error',
    });
  }
}
