import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  BrainCircuit, 
  BarChart3, 
  ArrowRight, 
  CheckCircle2, 
  MessageSquareQuote, 
  Tag, 
  Lock,
  Compass,
  AlertTriangle,
  ExternalLink,
  X
} from 'lucide-react';

interface LandingPageProps {
  onSignInWithGoogle: () => void;
  onSignInAsGuest: () => void;
  isLoading: boolean;
  popupErrorMessage?: string | null;
  onDismissError?: () => void;
  isDevPreview?: boolean;
  onToggleDevPreview?: (val?: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignInWithGoogle,
  onSignInAsGuest,
  isLoading,
  popupErrorMessage,
  onDismissError,
  isDevPreview = true,
  onToggleDevPreview,
}) => {
  const [interactiveInput, setInteractiveInput] = useState('');
  const [simulatedResult, setSimulatedResult] = useState<{
    mood: string;
    tags: string[];
    takeaway: string;
  } | null>(null);

  const handleTestReflection = (sampleText?: string) => {
    const text = sampleText || interactiveInput || 'I felt overwhelmed by the deadline today, but taking a ten-minute walk in the park helped me regain perspective and refocus.';
    setInteractiveInput(text);
    setSimulatedResult({
      mood: 'Reflective',
      tags: ['Work-Life Balance', 'Stress Management', 'Mindfulness', 'Nature'],
      takeaway: 'Micro-breaks and grounding outdoors significantly alleviate cognitive fatigue under tight deadlines.',
    });
  };

  return (
    <div id="landing-page-root" className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] flex flex-col font-serif">
      {/* Top Banner Notice */}
      <div className="bg-[#1A1A1A] text-[#FDFCFB] py-2.5 px-4 text-center text-[10px] font-sans font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 border-b border-[#333]">
        <Lock className="w-3.5 h-3.5 text-emerald-400" />
        <span>Strict Zero-Cross-User Data Isolation • Cloud Firestore Security Rules Enforced</span>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#FAF9F6] border border-[#EBE8E4] text-[#4A4844] text-[10px] font-sans font-bold uppercase tracking-[0.2em]">
              <Sparkles className="w-3 h-3 text-[#1A1A1A]" />
              <span>Mindset AI • Principal Coach Edition</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light italic tracking-tight text-[#1A1A1A] leading-[1.15]">
              Conversational journaling with your personal <span className="font-serif font-black uppercase not-italic tracking-tighter block mt-2">reflection coach.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#4A4844] leading-relaxed max-w-2xl mx-auto">
              Transform cognitive noise into grounded clarity. ReflectAI engages in empathetic Socratic dialogue, automatically extracts emotional trajectory and themes, and synthesizes weekly executive growth digests.
            </p>

            {/* Prominent Popup Error / Restriction Alert */}
            {popupErrorMessage && (
              <div 
                id="auth-popup-alert-banner"
                className="max-w-xl mx-auto p-4 bg-[#FFF8F0] border border-[#E6C280] text-left text-xs font-sans text-[#59380E] shadow-sm animate-fadeIn"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                      <p className="font-bold text-[11px] uppercase tracking-wider text-[#92400E]">
                        Google Sign-In Popup Notice
                      </p>
                      <p className="text-xs leading-relaxed text-[#78350F]">
                        {popupErrorMessage}
                      </p>
                      <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-semibold text-[#92400E]">Tip:</span>
                        <span>1. Allow popups for <strong>aistudio.google.com</strong> in browser address bar</span>
                        <span>•</span>
                        <span>2. Or click <strong>Demo / Guest Login</strong> below</span>
                      </div>
                    </div>
                  </div>
                  {onDismissError && (
                    <button
                      onClick={onDismissError}
                      className="text-[#92400E] hover:text-[#78350F] p-1 cursor-pointer"
                      aria-label="Dismiss alert"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Dev Mode / OAuth Mode Toggle Switch Banner */}
            <div className="max-w-xl mx-auto p-3.5 bg-white border border-[#EBE8E4] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${isDevPreview ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                      Auth Strategy: {isDevPreview ? 'Dev / Preview Mock Mode' : 'Live Firebase Google OAuth'}
                    </span>
                    <span className={`text-[9px] font-sans font-semibold uppercase px-1.5 py-0.5 ${isDevPreview ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                      {isDevPreview ? 'Iframe Safe' : 'Production'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#7D7A74] font-sans mt-0.5">
                    {isDevPreview 
                      ? "Bypasses external OAuth popup to prevent iframe restrictions. Logs in as Test User (test@example.com)."
                      : "Executes standard Firebase Google OAuth popup for Cloud Run / production deployments."}
                  </p>
                </div>
              </div>

              {onToggleDevPreview && (
                <button
                  id="dev-auth-mode-toggle-btn"
                  onClick={() => onToggleDevPreview()}
                  type="button"
                  className={`px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-wider border transition cursor-pointer shrink-0 ${
                    isDevPreview 
                      ? 'bg-[#FAF9F6] hover:bg-[#F2EFE9] text-[#1A1A1A] border-[#D4CFC7]' 
                      : 'bg-[#1A1A1A] hover:bg-[#333] text-white border-[#1A1A1A]'
                  }`}
                >
                  {isDevPreview ? 'Switch to Live OAuth' : 'Switch to Dev Mock'}
                </button>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                id="landing-google-signin-btn"
                onClick={onSignInWithGoogle}
                disabled={isLoading}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-[11px] font-sans font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                  />
                </svg>
                <span>
                  {isLoading 
                    ? 'Authenticating...' 
                    : isDevPreview 
                      ? 'Sign in with Google (Instant Test User)' 
                      : 'Sign in with Google (Live OAuth)'}
                </span>
              </button>

              <button
                id="landing-guest-signin-btn"
                onClick={onSignInAsGuest}
                disabled={isLoading}
                className="w-full sm:w-auto px-7 py-3.5 border border-[#EBE8E4] bg-white hover:bg-[#FAF9F6] text-[#1A1A1A] text-[11px] font-sans font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Demo Guest Login (Sandbox)</span>
              </button>
            </div>

            {/* Permanent Iframe / Popup Guidance Callout */}
            <div className="p-3.5 bg-[#FAF9F6] border border-[#EBE8E4] text-[11px] font-sans text-[#4A4844] max-w-xl mx-auto flex items-start gap-2.5 text-left">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></span>
              <div className="space-y-1">
                <p className="font-bold text-[10px] uppercase tracking-wider text-[#1A1A1A]">
                  AI Studio Preview Note:
                </p>
                <p className="text-[11px] text-[#7D7A74] leading-relaxed">
                  If Google Sign-In popup fails or is blocked by iframe security policies, ensure popups are allowed for <strong className="text-[#1A1A1A]">aistudio.google.com</strong> or use <strong>Demo / Guest Login</strong> for full interactive access.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-[10px] font-sans uppercase tracking-widest text-[#7D7A74]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1A1A1A]" /> Federated OAuth
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1A1A1A]" /> Isolated Firestore Path
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1A1A1A]" /> Real-time Cloud Sync
              </span>
            </div>
          </div>

          {/* Interactive Feature Demo Card */}
          <div className="mt-14 max-w-3xl mx-auto bg-white border border-[#EBE8E4] shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-[#FAF9F6] border-b border-[#EBE8E4] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-[#1A1A1A]"></div>
                <span className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-[#1A1A1A]">
                  Live Reflection & Sentiment Extraction Preview
                </span>
              </div>
              <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#7D7A74] bg-white px-2 py-0.5 border border-[#EBE8E4]">
                Gemini 3.6 Flash
              </span>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#A09D98] mb-2">
                  Sample Journal Draft
                </label>
                <textarea
                  id="landing-sample-textarea"
                  value={interactiveInput}
                  onChange={(e) => setInteractiveInput(e.target.value)}
                  placeholder="Type a thought or test a sample reflection..."
                  rows={3}
                  className="w-full p-4 border border-[#EBE8E4] bg-[#FAF9F6] text-[#1A1A1A] text-sm italic focus:bg-white focus:outline-none focus:border-[#1A1A1A] resize-none transition"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-sans font-bold text-[#A09D98] uppercase tracking-wider">Prompts:</span>
                  <button
                    onClick={() => handleTestReflection('Felt proud of shipping the project milestone, yet tired from long meetings.')}
                    className="text-[10px] font-sans font-medium px-2.5 py-1 bg-[#FAF9F6] hover:bg-[#F3F2EF] text-[#4A4844] border border-[#EBE8E4] transition cursor-pointer"
                  >
                    Milestone & Fatigue
                  </button>
                  <button
                    onClick={() => handleTestReflection('Grateful for a quiet morning coffee and deep conversation with an old friend.')}
                    className="text-[10px] font-sans font-medium px-2.5 py-1 bg-[#FAF9F6] hover:bg-[#F3F2EF] text-[#4A4844] border border-[#EBE8E4] transition cursor-pointer"
                  >
                    Gratitude & Coffee
                  </button>
                </div>

                <button
                  id="landing-test-extract-btn"
                  onClick={() => handleTestReflection()}
                  className="px-5 py-2 bg-[#1A1A1A] hover:bg-[#333] text-white font-sans text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 transition cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Analyze Sentiment
                </button>
              </div>

              {simulatedResult && (
                <div className="mt-4 p-5 bg-[#FAF9F6] border border-[#EBE8E4] space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#A09D98]">Detected State:</span>
                      <span className="px-2 py-0.5 bg-[#E1F2FF] text-[#2B5A82] text-[9px] font-sans font-bold uppercase rounded-full">
                        {simulatedResult.mood}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-sans font-bold text-[#A09D98] uppercase tracking-tighter">Tags:</span>
                      {simulatedResult.tags.map((tag, i) => (
                        <span key={i} className="text-[10px] font-sans text-[#7D7A74] bg-white border border-[#EBE8E4] px-2 py-0.5">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-[#4A4844] bg-white p-4 border border-[#EBE8E4] flex items-start gap-2.5">
                    <MessageSquareQuote className="w-4 h-4 text-[#1A1A1A] shrink-0 mt-0.5" />
                    <span className="italic leading-relaxed">
                      <strong className="font-sans not-italic font-bold text-[10px] uppercase tracking-wider text-[#1A1A1A] mr-1.5">Takeaway:</strong>
                      {simulatedResult.takeaway}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-20 bg-white border-t border-[#EBE8E4]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-light italic text-[#1A1A1A]">
              Architected for clarity, depth, and enterprise cloud isolation
            </h2>
            <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#A09D98] mt-2">
              The ReflectAI Engineering Principles
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 border border-[#EBE8E4] bg-[#FAF9F6] flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#A09D98] font-bold mb-3">Pillar 01</p>
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">Empathetic Reflection Coach</h3>
                <p className="text-xs text-[#4A4844] leading-relaxed">
                  Powered by Gemini 3.6 Flash with Socratic system prompts. Explores cognitive patterns, reframes challenges, and asks deep introspective questions.
                </p>
              </div>
            </div>

            <div className="p-6 border border-[#EBE8E4] bg-[#FAF9F6] flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#A09D98] font-bold mb-3">Pillar 02</p>
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">Strict Firestore Security</h3>
                <p className="text-xs text-[#4A4844] leading-relaxed">
                  All records reside under owner-bound paths (<code className="font-mono text-[10px] text-[#1A1A1A]">/users/{'{userId}'}/journal_entries</code>) protected by Firestore rules. Zero cross-user leaks.
                </p>
              </div>
            </div>

            <div className="p-6 border border-[#EBE8E4] bg-[#FAF9F6] flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#A09D98] font-bold mb-3">Pillar 03</p>
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">Automated Weekly Digests</h3>
                <p className="text-xs text-[#4A4844] leading-relaxed">
                  Aggregates 7-day reflection history, detecting dominant emotional trajectories, recurring cognitive triggers, and actionable mindfulness prompts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#EBE8E4] py-8 bg-[#FAF9F6] text-[#7D7A74] text-xs font-sans">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-black uppercase tracking-tighter text-[#1A1A1A]">ReflectAI</span>
            <span>•</span>
            <span className="text-[10px] uppercase tracking-wider">Cloud Run & Firestore Verified</span>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-[#A09D98]">Gemini 3.6 Flash & Firebase Authentication</p>
        </div>
      </footer>
    </div>
  );
};

