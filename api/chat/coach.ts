import { GoogleGenAI } from '@google/genai';

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
      console.warn(`[Vercel Gemini Fallback] Coach model ${modelName} failed:`, err?.message || err);
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
    const { messages = [], currentEntry = '', journalTopic = '' } = data;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    const ai = new GoogleGenAI({ apiKey });

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

    const { response, modelUsed } = await generateContentWithFallback(ai, {
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || 'I hear you. What felt most significant about that moment for you?';
    return res.status(200).json({ reply, modelUsed });
  } catch (error: any) {
    console.error('Vercel API error in /api/chat/coach:', error);
    return res.status(500).json({
      error: 'Failed to generate AI coaching response',
      message: error?.message || 'Unknown serverless error',
    });
  }
}
