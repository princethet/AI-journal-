import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { stripUndefined } from '../lib/sanitizer';
import type { JournalEntry, WeeklyDigest, UserProfile } from '../types';

const LOCAL_STORAGE_ENTRIES_KEY = 'reflectai_journal_entries_';
const LOCAL_STORAGE_DIGESTS_KEY = 'reflectai_weekly_digests_';

// Initial seed entries for immediate preview testing
const SEED_SAMPLE_ENTRIES: JournalEntry[] = [
  {
    id: 'seed-entry-1',
    userId: 'demo-guest',
    title: 'Navigating Ambiguity in Strategic Planning',
    content: 'Today was filled with conflicting priorities and changing milestones. Instead of reacting impulsively, I stepped back for 15 minutes, mapped out the core dependencies on paper, and realized that only two items were truly on the critical path. Feeling much clearer and grounded.',
    createdAt: Date.now() - 86400000 * 2, // 2 days ago
    updatedAt: Date.now() - 86400000 * 2,
    dateStr: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    mood: 'Reflective',
    sentimentScore: 0.45,
    tags: ['Strategy', 'Focus', 'Prioritization', 'Mindfulness'],
    summary: 'Clarified critical path dependencies during shifting milestone priorities through intentional pause.',
    growthTakeaway: 'Step back to identify true dependencies before reacting to shifting external demands.',
    energyLevel: 'Medium',
    wordCount: 54,
    conversation: [
      {
        id: 'c1',
        role: 'user',
        content: 'I felt overwhelmed by the sudden shift in our project deadline.',
        timestamp: Date.now() - 86400000 * 2,
      },
      {
        id: 'c2',
        role: 'assistant',
        content: 'What core assumptions changed with the new deadline, and which single deliverable drives 80% of the value?',
        timestamp: Date.now() - 86400000 * 2 + 1000,
      }
    ]
  },
  {
    id: 'seed-entry-2',
    userId: 'demo-guest',
    title: 'Gratitude for Quiet Morning Focus & Flow',
    content: 'Woke up early before notifications started rolling in. Dedicated an uninterrupted hour to deep writing and philosophical reading. The mental spaciousness from starting the morning without screens made the entire rest of the day feel lighter.',
    createdAt: Date.now() - 86400000 * 4, // 4 days ago
    updatedAt: Date.now() - 86400000 * 4,
    dateStr: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
    mood: 'Peaceful',
    sentimentScore: 0.85,
    tags: ['Morning Ritual', 'Gratitude', 'Deep Work', 'Wellbeing'],
    summary: 'Protected morning solitude without notifications to cultivate sustained calm and clarity.',
    growthTakeaway: 'Guarding the first hour of the day from external inputs anchors cognitive resilience.',
    energyLevel: 'High',
    wordCount: 48,
    conversation: []
  },
  {
    id: 'seed-entry-3',
    userId: 'demo-guest',
    title: 'Post-Milestone Fatigue & Recovery Boundary',
    content: 'Shipped the major release cycle today. While proud of the team execution, I notice deep physical fatigue and cognitive fog. Decided to turn off work notifications for the evening and take a long walk without headphones.',
    createdAt: Date.now() - 86400000 * 6, // 6 days ago
    updatedAt: Date.now() - 86400000 * 6,
    dateStr: new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0],
    mood: 'Grateful',
    sentimentScore: 0.6,
    tags: ['Milestone', 'Burnout Prevention', 'Boundaries', 'Health'],
    summary: 'Recognized physical fatigue after shipping release and instituted evening recovery boundary.',
    growthTakeaway: 'Honor energy cycles by pairing high-intensity sprints with deliberate disconnect periods.',
    energyLevel: 'Low',
    wordCount: 46,
    conversation: []
  }
];

function getLocalEntries(userId: string): JournalEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ENTRIES_KEY + userId);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not read from localStorage:', e);
  }
  // If demo or test user has no local entries, seed them with sample entries
  if (userId.includes('demo') || userId.includes('guest') || userId.includes('test') || userId.includes('mock')) {
    const seeded = SEED_SAMPLE_ENTRIES.map(e => ({ ...e, userId }));
    setLocalEntries(userId, seeded);
    return seeded;
  }
  return [];
}

function setLocalEntries(userId: string, entries: JournalEntry[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_ENTRIES_KEY + userId, JSON.stringify(entries));
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
}

function getLocalDigests(userId: string): WeeklyDigest[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DIGESTS_KEY + userId);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not read digests from localStorage:', e);
  }
  return [];
}

function setLocalDigests(userId: string, digests: WeeklyDigest[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_DIGESTS_KEY + userId, JSON.stringify(digests));
  } catch (e) {
    console.warn('Could not save digests to localStorage:', e);
  }
}

/**
 * Sync user profile to Firestore (with local fallback)
 */
export async function syncUserProfile(user: UserProfile): Promise<void> {
  if (!user.uid) return;
  // If not authenticated with Firebase Auth or in local demo mode, skip remote write
  if (!auth.currentUser || auth.currentUser.uid !== user.uid) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    const payload = stripUndefined({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLoginAt: Date.now(),
    });
    await setDoc(userRef, payload, { merge: true });
  } catch (err) {
    console.warn('Firestore user profile sync bypassed (local/demo mode active):', err);
  }
}

/**
 * Save or overwrite a journal entry under /users/{userId}/journal_entries/{entryId}
 */
export async function saveJournalEntry(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId) throw new Error('User ID is required to save journal entry');
  if (!entry.id) throw new Error('Entry ID is required');

  const cleanData = stripUndefined({
    ...entry,
    userId,
    updatedAt: Date.now(),
  }) as JournalEntry;

  // Always update local cache for seamless offline / demo reliability
  const currentLocal = getLocalEntries(userId);
  const existingIdx = currentLocal.findIndex(e => e.id === entry.id);
  let updatedLocal: JournalEntry[];
  if (existingIdx >= 0) {
    updatedLocal = [...currentLocal];
    updatedLocal[existingIdx] = cleanData;
  } else {
    updatedLocal = [cleanData, ...currentLocal];
  }
  setLocalEntries(userId, updatedLocal);

  // If authenticated with Firebase Auth, sync to Cloud Firestore
  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      const entryRef = doc(db, 'users', userId, 'journal_entries', entry.id);
      await setDoc(entryRef, cleanData);
    } catch (cloudErr) {
      console.warn('Cloud Firestore save notice (retained in local storage):', cloudErr);
    }
  }
}

/**
 * Delete a journal entry
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) throw new Error('User ID and Entry ID required');

  // Update local storage
  const currentLocal = getLocalEntries(userId);
  const updatedLocal = currentLocal.filter(e => e.id !== entryId);
  setLocalEntries(userId, updatedLocal);

  // If authenticated with Firebase Auth, delete from Cloud Firestore
  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      const entryRef = doc(db, 'users', userId, 'journal_entries', entryId);
      await deleteDoc(entryRef);
    } catch (cloudErr) {
      console.warn('Cloud Firestore delete notice (deleted from local storage):', cloudErr);
    }
  }
}

/**
 * Subscribe to real-time updates for user's journal entries
 */
export function subscribeToJournalEntries(
  userId: string,
  onData: (entries: JournalEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    onData([]);
    return () => {};
  }

  // Pre-load local storage data immediately for instant responsive render
  const localData = getLocalEntries(userId);
  onData(localData);

  // If user is not authenticated with Firebase Auth or in sandbox mode, skip remote Firestore listener
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return () => {};
  }

  try {
    const entriesRef = collection(db, 'users', userId, 'journal_entries');
    const q = query(entriesRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const items: JournalEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as JournalEntry;
          items.push({
            ...data,
            id: docSnap.id,
          });
        });
        if (items.length > 0) {
          setLocalEntries(userId, items);
          onData(items);
        }
      },
      (err) => {
        console.warn('Firestore onSnapshot fallback to local state:', err);
        // Only propagate error if it's not a permission error handled gracefully by local state
        if (onError && (err as any).code !== 'permission-denied') {
          onError(err);
        }
      }
    );
  } catch (e) {
    console.warn('Firestore subscription exception (running local state):', e);
    return () => {};
  }
}

/**
 * Save a weekly digest under /users/{userId}/weekly_digests/{digestId}
 */
export async function saveWeeklyDigest(userId: string, digest: WeeklyDigest): Promise<void> {
  if (!userId || !digest.id) throw new Error('Invalid digest save payload');
  const cleanData = stripUndefined({
    ...digest,
    userId,
  }) as WeeklyDigest;

  // Local storage cache
  const currentDigests = getLocalDigests(userId);
  const updatedDigests = [cleanData, ...currentDigests.filter(d => d.id !== digest.id)];
  setLocalDigests(userId, updatedDigests);

  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      const digestRef = doc(db, 'users', userId, 'weekly_digests', digest.id);
      await setDoc(digestRef, cleanData);
    } catch (err) {
      console.warn('Cloud Firestore digest save notice (retained in local storage):', err);
    }
  }
}

/**
 * Fetch past weekly digests for a user
 */
export async function getWeeklyDigests(userId: string): Promise<WeeklyDigest[]> {
  if (!userId) return [];
  const local = getLocalDigests(userId);

  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return local;
  }

  try {
    const digestsRef = collection(db, 'users', userId, 'weekly_digests');
    const q = query(digestsRef, orderBy('generatedAt', 'desc'));
    const snapshot = await getDocs(q);
    const results: WeeklyDigest[] = [];
    snapshot.forEach((docSnap) => {
      results.push(docSnap.data() as WeeklyDigest);
    });
    if (results.length > 0) {
      setLocalDigests(userId, results);
      return results;
    }
    return local;
  } catch (err) {
    console.warn('Cloud Firestore getWeeklyDigests fallback to local cache:', err);
    return local;
  }
}
