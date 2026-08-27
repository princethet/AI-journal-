export type MoodType = 
  | 'Reflective'
  | 'Anxious'
  | 'Grateful'
  | 'Motivated'
  | 'Peaceful'
  | 'Challenged'
  | 'Joyful'
  | 'Overwhelmed'
  | 'Empowered';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  dateStr: string; // YYYY-MM-DD for easy filtering
  mood: MoodType;
  sentimentScore: number; // -1.0 to +1.0
  tags: string[];
  summary: string;
  growthTakeaway: string;
  energyLevel: 'Low' | 'Medium' | 'High';
  wordCount: number;
  conversation: ChatMessage[];
}

export interface WeeklyDigest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  entryCount: number;
  dominantMoods: { mood: MoodType; count: number }[];
  keyThemes: string[];
  growthHighlights: string[];
  recurringPatterns: string[];
  actionablePrompts: string[];
  executiveSummary: string;
  generatedAt: number;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
  isDemo?: boolean;
  createdAt?: number;
  lastLoginAt?: number;
}

export interface FilterState {
  searchQuery: string;
  selectedMood: string;
  selectedTag: string;
  dateRange: 'all' | 'today' | '7days' | '30days';
  sortBy: 'newest' | 'oldest';
}

export interface ThreatZoneCountermeasure {
  zone: string;
  threat: string;
  owaspRef: string;
  countermeasure: string;
  status: 'Enforced' | 'Active';
}
