import type { ChatMessage, MoodType, WeeklyDigest } from '../types';

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

/**
 * Send conversational reflection message to Gemini coach
 */
export async function sendCoachMessage(
  messages: ChatMessage[],
  currentEntry: string = '',
  journalTopic: string = ''
): Promise<CoachResponse> {
  const response = await fetch('/api/chat/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, currentEntry, journalTopic }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || `Server responded with status ${response.status}`);
  }

  return response.json();
}

/**
 * Request automated AI metadata extraction (sentiment, tags, summary, growth takeaway)
 */
export async function analyzeJournalEntry(
  title: string,
  content: string,
  conversation: ChatMessage[] = []
): Promise<AnalysisResponse> {
  const response = await fetch('/api/journal/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, conversation }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || `Analysis failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Generate weekly digest from past 7 days of entries
 */
export async function generateWeeklyDigestAI(
  entries: any[],
  startDate: string,
  endDate: string
): Promise<DigestResponse> {
  const response = await fetch('/api/journal/weekly-digest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries, startDate, endDate }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || `Weekly digest generation failed with status ${response.status}`);
  }

  return response.json();
}
