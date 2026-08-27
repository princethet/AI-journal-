import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { 
  signInWithGoogle, 
  signInAsGuest, 
  logOut, 
  onAuthChange
} from './lib/firebase';
import { 
  syncUserProfile, 
  subscribeToJournalEntries, 
  saveJournalEntry, 
  deleteJournalEntry, 
  saveWeeklyDigest, 
  getWeeklyDigests 
} from './services/firestoreService';
import type { JournalEntry, WeeklyDigest, UserProfile } from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { ChatJournal } from './components/ChatJournal';
import { EntryHistory } from './components/EntryHistory';
import { WeeklyDigestView } from './components/WeeklyDigestView';
import { ThreatModelModal } from './components/ThreatModelModal';
import { ToastContainer, type ToastMessage } from './components/Toast';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isDevPreview, setIsDevPreview] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('reflectai_is_dev_preview');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const [popupError, setPopupError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'journal' | 'history' | 'digest'>('journal');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [digests, setDigests] = useState<WeeklyDigest[]>([]);
  const [activeEditingEntry, setActiveEditingEntry] = useState<JournalEntry | null>(null);
  const [isThreatModalOpen, setIsThreatModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const handleToggleDevPreview = (val?: boolean) => {
    setIsDevPreview((prev) => {
      const nextVal = val !== undefined ? val : !prev;
      try {
        localStorage.setItem('reflectai_is_dev_preview', String(nextVal));
      } catch (e) {
        console.warn('Could not store dev preview preference:', e);
      }
      addToast(
        'info', 
        nextVal ? 'Dev / Preview Mode Activated' : 'Production OAuth Mode Activated',
        nextVal 
          ? 'Sign in with Google will now bypass iframe popup restrictions with instant Test User login.'
          : 'Sign in with Google will now invoke the live Firebase Google OAuth popup.'
      );
      return nextVal;
    });
  };

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user: User | null) => {
      if (user) {
        const userProfile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || (user.isAnonymous ? 'Guest Journaler' : 'Mindful Journaler'),
          photoURL: user.photoURL,
          isAnonymous: user.isAnonymous,
        };
        setCurrentUser(userProfile);
        setPopupError(null);

        // Sync user profile to Firestore
        try {
          await syncUserProfile(userProfile);
        } catch (err) {
          console.warn('Profile sync notice:', err);
        }
      } else {
        setCurrentUser(null);
        setEntries([]);
        setDigests([]);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Subscription to Journal Entries & Weekly Digests when user is logged in
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Subscribe to Firestore user-isolated entries
    const unsubscribeEntries = subscribeToJournalEntries(
      currentUser.uid,
      (fetchedEntries) => {
        setEntries(fetchedEntries);
      },
      (error: any) => {
        if (error?.code !== 'permission-denied') {
          console.warn('Real-time database sync notice:', error);
        }
      }
    );

    // Fetch weekly digests
    getWeeklyDigests(currentUser.uid)
      .then((fetchedDigests) => {
        setDigests(fetchedDigests);
      })
      .catch((err) => {
        console.error('Error fetching weekly digests:', err);
      });

    return () => {
      unsubscribeEntries();
    };
  }, [currentUser?.uid]);

  // Handle Google Sign-in (supports Dev / Preview Mock Mode and Live Firebase OAuth)
  const handleSignInGoogle = async () => {
    // 1. Mock / Dev Preview Mode: bypass external OAuth popup in AI Studio iframe
    if (isDevPreview) {
      setAuthLoading(true);
      setPopupError(null);
      try {
        const testUser: UserProfile = {
          uid: 'test-user-google-preview',
          displayName: 'Test User',
          email: 'test@example.com',
          photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          isAnonymous: false,
          isDemo: true,
          createdAt: Date.now(),
        };
        setCurrentUser(testUser);
        addToast(
          'success', 
          'Dev Mode: Signed in as Test User', 
          'External popup bypassed for AI Studio iframe preview. All AI features & local persistence active.'
        );
      } catch (err: any) {
        console.error('Dev auth mock error:', err);
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    // 2. Production Firebase Google OAuth Flow (Used when exported or deployed to Cloud Run / production)
    try {
      setAuthLoading(true);
      setPopupError(null);
      const user = await signInWithGoogle();
      if (user) {
        addToast('success', 'Authenticated Successfully', 'Welcome to your private reflection space.');
      }
    } catch (err: any) {
      console.warn('Google Sign-In Popup handler notice:', err);
      const code = err?.code;
      const isPopupBlocked = 
        code === 'auth/popup-blocked' || 
        code === 'auth/cancelled-popup-request' || 
        code === 'auth/popup-closed-by-user' ||
        (err?.message && err.message.toLowerCase().includes('popup'));
      
      const errorMsg = isPopupBlocked
        ? 'The sign-in popup was blocked or closed before completion. Please allow popups for aistudio.google.com, open the app in a new tab, or switch to Dev Preview Mode.'
        : (err?.message || 'Authentication encountered a cross-origin error. Please switch to Dev Preview Mode or allow popups.');
      
      setPopupError(errorMsg);
      addToast('error', 'Google Sign-In Notice', errorMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Guest / Demo Sign-in
  const handleSignInGuest = async () => {
    try {
      setAuthLoading(true);
      setPopupError(null);
      try {
        const user = await signInAsGuest('Demo Explorer');
        const userProfile: UserProfile = {
          uid: user.uid,
          email: 'demo.preview@reflectai.internal',
          displayName: user.displayName || 'Demo Explorer',
          photoURL: null,
          isAnonymous: true,
        };
        setCurrentUser(userProfile);
        addToast('success', 'Demo Guest Session Active', 'Connected via Firebase Anonymous User authentication.');
      } catch (authErr) {
        console.warn('Anonymous Auth restricted in preview container; activating mock sandbox state:', authErr);
        const fallbackProfile: UserProfile = {
          uid: 'demo-guest-preview',
          email: 'demo.preview@reflectai.internal',
          displayName: 'Demo Explorer',
          photoURL: null,
          isAnonymous: true,
          isDemo: true,
        };
        setCurrentUser(fallbackProfile);
        addToast('success', 'Demo Sandbox Mode Active', 'Welcome! You can now test all AI reflection, coaching, and synthesis features inside the preview.');
      }
    } catch (err: any) {
      console.error('Guest sign-in failed:', err);
      addToast('error', 'Guest Sign-in Notice', err?.message || 'Could not start guest session.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (err) {
      console.warn('Sign-out exception bypassed:', err);
    }
    setCurrentUser(null);
    setActiveEditingEntry(null);
    setCurrentTab('journal');
    setPopupError(null);
    addToast('info', 'Signed Out', 'You have been safely signed out.');
  };

  // Handle Saving an Entry
  const handleSaveEntry = async (entry: JournalEntry) => {
    if (!currentUser?.uid) return;
    try {
      await saveJournalEntry(currentUser.uid, entry);
      addToast('success', 'Reflection Saved', `"${entry.title}" is saved in your private Firestore path.`);
      setActiveEditingEntry(null);
    } catch (err: any) {
      console.error('Error saving entry:', err);
      addToast('error', 'Failed to Save Reflection', err?.message || 'Please check your database connectivity.');
      throw err;
    }
  };

  // Handle Deleting an Entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!currentUser?.uid) return;
    try {
      await deleteJournalEntry(currentUser.uid, entryId);
      addToast('info', 'Reflection Deleted', 'The journal entry has been permanently removed.');
      if (activeEditingEntry?.id === entryId) {
        setActiveEditingEntry(null);
      }
    } catch (err: any) {
      console.error('Error deleting entry:', err);
      addToast('error', 'Delete Failed', err?.message || 'Could not delete entry.');
    }
  };

  // Handle Saving a Weekly Digest
  const handleSaveDigest = async (digest: WeeklyDigest) => {
    if (!currentUser?.uid) return;
    try {
      await saveWeeklyDigest(currentUser.uid, digest);
      setDigests((prev) => [digest, ...prev.filter((d) => d.id !== digest.id)]);
      addToast('success', 'Weekly Digest Synthesized', 'Your 7-day reflection summary has been generated and archived.');
    } catch (err: any) {
      console.error('Error saving digest:', err);
      addToast('error', 'Digest Save Failed', err?.message || 'Could not archive digest.');
    }
  };

  // Switch to edit mode from history
  const handleSelectEntryForEdit = (entry: JournalEntry) => {
    setActiveEditingEntry(entry);
    setCurrentTab('journal');
  };

  // Initial loading spinner
  if (authLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#1A1A1A] border-t-transparent animate-spin" />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A09D98]">Initializing Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] flex flex-col font-serif selection:bg-[#1A1A1A] selection:text-white">
      {/* Navigation Header */}
      <Navbar
        user={currentUser}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenThreatModal={() => setIsThreatModalOpen(true)}
        onSignOut={handleSignOut}
        isDevPreview={isDevPreview}
        onToggleDevPreview={handleToggleDevPreview}
      />

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentUser ? (
          // Public Landing & Auth Splash View
          <LandingPage
            onSignInWithGoogle={handleSignInGoogle}
            onSignInAsGuest={handleSignInGuest}
            isLoading={authLoading}
            popupErrorMessage={popupError}
            onDismissError={() => setPopupError(null)}
            isDevPreview={isDevPreview}
            onToggleDevPreview={handleToggleDevPreview}
          />
        ) : (
          // Authenticated Dashboard Views
          <div>
            {currentTab === 'journal' && (
              <ChatJournal
                userId={currentUser.uid}
                onSaveEntry={handleSaveEntry}
                existingEntry={activeEditingEntry}
                onClearActiveEntry={() => setActiveEditingEntry(null)}
              />
            )}

            {currentTab === 'history' && (
              <EntryHistory
                entries={entries}
                onSelectEntryForEdit={handleSelectEntryForEdit}
                onDeleteEntry={handleDeleteEntry}
                onNewEntryClick={() => {
                  setActiveEditingEntry(null);
                  setCurrentTab('journal');
                }}
              />
            )}

            {currentTab === 'digest' && (
              <WeeklyDigestView
                userId={currentUser.uid}
                entries={entries}
                savedDigests={digests}
                onSaveDigest={handleSaveDigest}
              />
            )}
          </div>
        )}
      </main>

      {/* Security Threat Model Dialog */}
      <ThreatModelModal
        isOpen={isThreatModalOpen}
        onClose={() => setIsThreatModalOpen(false)}
      />

      {/* Toast Notification Layer */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
