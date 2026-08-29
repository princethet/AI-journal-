import { GoogleGenAI, Type } from '@google/genai';
import type { ChatMessage, MoodType } from '../types';

export interface CoachResponse {
  reply: string;
  modelUsed: string;
}

export interface AnalysisResponse {
  sentiment: MoodType;
  sentimentScore: number;
  tags: string[];
  summary: string;
  growthTakeaway: string;
  energyLevel: 'Low' | 'Medium' | 'High';
  modelUsed: string;
}

export interface DigestResponse {
  executiveSummary: string;
  keyThemes: string[];
  growthHighlights: string[];
  recurringPatterns: string[];
  actionablePrompts: string[];
  modelUsed: string;
}

// Resilient Model Fallback Ladder
const CLIENT_MODEL_LADDER = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-pro'
];

/**
 * Get client-side Gemini AI client if API key is accessible in browser env
 */
function getClientGenAI(): GoogleGenAI | null {
  try {
    const key =
      (import.meta.env.VITE_GEMINI_API_KEY as string) ||
      (import.meta.env.GEMINI_API_KEY as string) ||
      '';
    if (key && key !== 'YOUR_GEMINI_API_KEY') {
      return new GoogleGenAI({ apiKey: key });
    }
  } catch (e) {
    // Environment lookup ignored in non-vite context
  }
  return null;
}

/**
 * Deterministic Semantic Heuristic Fallback for Metadata Extraction
 */
function extractHeuristicInsights(
  title: string,
  content: string,
  conversation: ChatMessage[] = []
): AnalysisResponse {
  const combinedText = `${title} ${content} ${conversation.map((c) => c.content).join(' ')}`.toLowerCase();

  // Sentiment scoring
  const positiveWords = ['grateful', 'joy', 'happy', 'excited', 'peace', 'calm', 'win', 'accomplished', 'proud', 'energized', 'motivated', 'hope', 'growth', 'clarity'];
  const negativeWords = ['anxious', 'worried', 'stress', 'overwhelmed', 'tired', 'stuck', 'hard', 'struggle', 'sad', 'doubt', 'frustrated', 'exhausted', 'fear', 'burnt'];

  let posCount = 0;
  let negCount = 0;

  positiveWords.forEach((w) => {
    if (combinedText.includes(w)) posCount++;
  });
  negativeWords.forEach((w) => {
    if (combinedText.includes(w)) negCount++;
  });

  let sentiment: MoodType = 'Reflective';
  let sentimentScore = 0.2;

  if (posCount > negCount + 1) {
    sentiment = combinedText.includes('grateful') ? 'Grateful' : combinedText.includes('peace') ? 'Peaceful' : 'Joyful';
    sentimentScore = Math.min(0.85, 0.3 + posCount * 0.15);
  } else if (negCount > posCount + 1) {
    sentiment = combinedText.includes('overwhelm') ? 'Overwhelmed' : combinedText.includes('anxious') ? 'Anxious' : 'Challenged';
    sentimentScore = Math.max(-0.85, -0.3 - negCount * 0.15);
  } else if (combinedText.includes('goal') || combinedText.includes('build') || combinedText.includes('forward')) {
    sentiment = 'Motivated';
    sentimentScore = 0.5;
  }

  // Energy Level
  let energyLevel: 'Low' | 'Medium' | 'High' = 'Medium';
  if (combinedText.includes('exhausted') || combinedText.includes('tired') || combinedText.includes('drained') || combinedText.includes('low energy')) {
    energyLevel = 'Low';
  } else if (combinedText.includes('excited') || combinedText.includes('energized') || combinedText.includes('intense') || combinedText.includes('high energy')) {
    energyLevel = 'High';
  }

  // Tag extraction
  const potentialTags = [
    { tag: 'Mindfulness', match: ['mind', 'present', 'breathe', 'peace', 'meditat', 'reflect'] },
    { tag: 'Career', match: ['work', 'job', 'project', 'team', 'code', 'architect', 'lead', 'client', 'career'] },
    { tag: 'Personal Growth', match: ['learn', 'improve', 'habit', 'grow', 'goal', 'challenge', 'progress'] },
    { tag: 'Health & Wellness', match: ['sleep', 'workout', 'exercise', 'health', 'walk', 'food', 'body'] },
    { tag: 'Relationships', match: ['friend', 'family', 'partner', 'colleague', 'meeting', 'social'] },
    { tag: 'Creativity', match: ['design', 'create', 'write', 'art', 'idea', 'build', 'inspire'] },
    { tag: 'Productivity', match: ['focus', 'time', 'task', 'plan', 'routine', 'efficient', 'deadline'] },
  ];

  const extractedTags: string[] = [];
  potentialTags.forEach((pt) => {
    if (pt.match.some((m) => combinedText.includes(m))) {
      extractedTags.push(pt.tag);
    }
  });

  if (extractedTags.length === 0) {
    extractedTags.push('Reflection', 'Self-Awareness', 'Mindfulness');
  }

  // Clean summary synthesis
  const cleanTitle = title.trim() || 'Reflection session';
  const firstSentence = content.trim().split(/[.!?]\s+/)[0] || 'Explored daily experiences and thoughts.';
  const summary = `${cleanTitle}: ${firstSentence.slice(0, 140)}${firstSentence.length > 140 ? '...' : '.'}`;

  const growthTakeaways = [
    'Acknowledging both challenges and small wins builds sustainable resilience and self-trust.',
    'Creating conscious space to pause and reflect transforms daily momentum into intentional wisdom.',
    'Focusing on what is directly within your circle of control protects your cognitive clarity.',
    'Small, consistent adjustments to boundaries yield compounding peace of mind over time.',
  ];
  const growthTakeaway = growthTakeaways[Math.floor(Math.random() * growthTakeaways.length)];

  return {
    sentiment,
    sentimentScore,
    tags: extractedTags.slice(0, 4),
    summary,
    growthTakeaway,
    energyLevel,
    modelUsed: 'deterministic-heuristic-engine',
  };
}

/**
 * Send conversational reflection message to Gemini coach
 * Multi-tier: Backend API -> Direct Client Gemini SDK -> Grounded Socratic Response
 */
export async function sendCoachMessage(
  messages: ChatMessage[],
  currentEntry: string = '',
  journalTopic: string = ''
): Promise<CoachResponse> {
  // 1. Primary: Try backend API proxy route
  try {
    const response = await fetch('/api/chat/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, currentEntry, journalTopic }),
    });

    if (response.ok) {
      return await response.json();
    }
    console.warn(`[AI Service] /api/chat/coach responded with status ${response.status}. Attempting client-side fallback...`);
  } catch (netErr) {
    console.warn('[AI Service] Network error calling /api/chat/coach:', netErr);
  }

  // 2. Client-side Gemini SDK fallback
  const clientGenAI = getClientGenAI();
  if (clientGenAI) {
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(msg.content || '') }],
    }));

    const systemInstruction = `You are ReflectAI, an empathetic, insightful, and constructive reflection coach and conversational journaling mentor.
Your role is to guide the user in deepening their self-awareness, identifying cognitive patterns, validating genuine emotions, reframing obstacles with growth mindset, and uncovering underlying values.

Guidelines:
1. Warmth & Attunement: Acknowledge and validate the user's feelings without toxic positivity.
2. Socratic Guidance: Respond with 2-4 sentences of deep reflection followed by ONE powerful, open-ended question.
3. Tone: Grounded, compassionate, calm, and non-judgmental.
${currentEntry ? `Current Journal Draft Context:\n"${currentEntry}"\n` : ''}
${journalTopic ? `Focus Topic: ${journalTopic}\n` : ''}`;

    for (const modelName of CLIENT_MODEL_LADDER) {
      try {
        const genRes = await clientGenAI.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        const reply = genRes.text || 'I hear your reflection. What aspect of this experience feels most meaningful to explore deeper?';
        return { reply, modelUsed: `${modelName} (client-direct)` };
      } catch (gemErr) {
        console.warn(`[Client Gemini] Model ${modelName} failed:`, gemErr);
      }
    }
  }

  // 3. Empathetic Socratic mentor fallback if offline/no key
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  let reply = "I hear the intention and thoughtfulness behind what you're writing. When you step back and observe this situation, what value or priority matters most to you right now?";
  
  if (lastUserMsg.toLowerCase().includes('anxious') || lastUserMsg.toLowerCase().includes('stress')) {
    reply = "It is completely valid to experience tension when navigating complex challenges. If you grant yourself permission to pause for a moment, what is one small thing you can release control over today?";
  } else if (lastUserMsg.toLowerCase().includes('decision') || lastUserMsg.toLowerCase().includes('choice')) {
    reply = "Big decisions often clarify what we truly care about. If you looked back on this choice one year from now, which path aligns most genuinely with your core values?";
  } else if (lastUserMsg.toLowerCase().includes('grateful') || lastUserMsg.toLowerCase().includes('win')) {
    reply = "Savoring these positive moments creates lasting cognitive resilience. How can you carry this sense of appreciation into the rest of your week?";
  }

  return {
    reply,
    modelUsed: 'reflective-socratic-mentor',
  };
}

/**
 * Request automated AI metadata extraction (sentiment, tags, summary, growth takeaway)
 * Multi-tier: Backend API -> Direct Client Gemini SDK Structured Schema -> Heuristic Extraction
 */
export async function analyzeJournalEntry(
  title: string,
  content: string,
  conversation: ChatMessage[] = []
): Promise<AnalysisResponse> {
  // 1. Primary: Try backend API proxy route
  try {
    const response = await fetch('/api/journal/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, conversation }),
    });

    if (response.ok) {
      return await response.json();
    }
    console.warn(`[AI Service] /api/journal/analyze returned status ${response.status}. Initiating seamless client-side extraction...`);
  } catch (netErr) {
    console.warn('[AI Service] Network error calling /api/journal/analyze:', netErr);
  }

  // 2. Client-side Gemini SDK Direct Structured Extraction Fallback
  const clientGenAI = getClientGenAI();
  if (clientGenAI) {
    const conversationTranscript = conversation
      .map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
      .join('\n');

    const promptText = `Analyze this user's journal reflection and conversation with their AI coach:

Title: ${title}

Journal Text:
${content}

${conversationTranscript ? `Coaching Transcript:\n${conversationTranscript}` : ''}

Please extract structured emotional and cognitive insights from this reflection.`;

    for (const modelName of CLIENT_MODEL_LADDER) {
      try {
        const genRes = await clientGenAI.models.generateContent({
          model: modelName,
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
                },
                sentimentScore: { type: Type.NUMBER },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                summary: { type: Type.STRING },
                growthTakeaway: { type: Type.STRING },
                energyLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
              },
              required: ['sentiment', 'sentimentScore', 'tags', 'summary', 'growthTakeaway', 'energyLevel'],
            },
          },
        });

        if (genRes.text) {
          const parsed = JSON.parse(genRes.text);
          return {
            ...parsed,
            modelUsed: `${modelName} (client-direct)`,
          };
        }
      } catch (gemErr) {
        console.warn(`[Client Gemini] Extraction on ${modelName} failed:`, gemErr);
      }
    }
  }

  // 3. Resilient Deterministic Semantic Heuristic Engine
  return extractHeuristicInsights(title, content, conversation);
}

/**
 * Generate weekly digest from past 7 days of entries
 * Multi-tier: Backend API -> Direct Client Gemini SDK -> Heuristic Digest Synthesizer
 */
export async function generateWeeklyDigestAI(
  entries: any[],
  startDate: string,
  endDate: string
): Promise<DigestResponse> {
  // 1. Primary: Try backend API proxy route
  try {
    const response = await fetch('/api/journal/weekly-digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries, startDate, endDate }),
    });

    if (response.ok) {
      return await response.json();
    }
    console.warn(`[AI Service] /api/journal/weekly-digest returned status ${response.status}. Attempting client-side fallback...`);
  } catch (netErr) {
    console.warn('[AI Service] Network error calling /api/journal/weekly-digest:', netErr);
  }

  // 2. Client-side Gemini SDK Fallback
  const clientGenAI = getClientGenAI();
  if (clientGenAI) {
    const formattedEntries = entries
      .map((entry: any, idx: number) => {
        return `[Entry ${idx + 1}] Date: ${entry.dateStr || 'Recent'} | Title: ${entry.title || 'Untitled'} | Mood: ${entry.mood || 'Reflective'}
Tags: ${(entry.tags || []).join(', ')}
Content Snippet: ${(entry.content || '').slice(0, 300)}
Takeaway: ${entry.growthTakeaway || 'None provided'}`;
      })
      .join('\n\n');

    const promptText = `Here are the journal entries logged by the user across the past 7 days (${startDate} to ${endDate}):

${formattedEntries}

Please generate a comprehensive, structured Weekly Reflection Digest that highlights emotional patterns, key milestones, recurring challenges, and actionable growth exercises for the coming week.`;

    for (const modelName of CLIENT_MODEL_LADDER) {
      try {
        const genRes = await clientGenAI.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                executiveSummary: { type: Type.STRING },
                keyThemes: { type: Type.ARRAY, items: { type: Type.STRING } },
                growthHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                recurringPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                actionablePrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['executiveSummary', 'keyThemes', 'growthHighlights', 'recurringPatterns', 'actionablePrompts'],
            },
          },
        });

        if (genRes.text) {
          const parsed = JSON.parse(genRes.text);
          return {
            ...parsed,
            modelUsed: `${modelName} (client-direct)`,
          };
        }
      } catch (gemErr) {
        console.warn(`[Client Gemini] Digest generation on ${modelName} failed:`, gemErr);
      }
    }
  }

  // 3. Deterministic Weekly Digest Synthesizer Fallback
  const allTags = entries.flatMap((e) => e.tags || []);
  const tagCounts: Record<string, number> = {};
  allTags.forEach((t) => {
    tagCounts[t] = (tagCounts[t] || 0) + 1;
  });
  const topThemes = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([t]) => t);

  return {
    executiveSummary: `Across ${entries.length} reflections between ${startDate} and ${endDate}, you demonstrated consistent engagement with your personal growth. Your journaling captured key thoughts on ${topThemes.join(', ') || 'mindfulness and daily experiences'}, fostering continuous self-awareness and emotional equilibrium.`,
    keyThemes: topThemes.length > 0 ? topThemes : ['Mindfulness', 'Personal Growth', 'Focus & Clarity'],
    growthHighlights: [
      `Maintained a dedicated reflection rhythm across ${entries.length} journal session(s).`,
      'Actively logged and identified emotional patterns and takeaways.',
      'Showed thoughtful perspective when processing daily decisions and challenges.',
    ],
    recurringPatterns: [
      'Clarity and calmness consistently increase following structured reflection sessions.',
      'Focusing on actionable next steps helps reduce mental fatigue and cognitive overload.',
    ],
    actionablePrompts: [
      'What is one boundary you can set this week to protect your creative and mental focus?',
      'Reflecting on this past week, what achievement—big or small—are you most genuinely proud of?',
      'Where can you show yourself more patience and self-compassion as you work toward your goals?',
    ],
    modelUsed: 'deterministic-digest-synthesizer',
  };
}
