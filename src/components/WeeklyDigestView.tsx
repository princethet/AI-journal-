import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Sparkles, 
  TrendingUp, 
  Compass, 
  BrainCircuit, 
  CheckCircle2, 
  Lightbulb, 
  Save, 
  Clock, 
  RefreshCw, 
  History,
  Smile,
  Zap
} from 'lucide-react';
import type { JournalEntry, WeeklyDigest, MoodType } from '../types';
import { generateWeeklyDigestAI } from '../services/aiService';

interface WeeklyDigestViewProps {
  userId: string;
  entries: JournalEntry[];
  savedDigests: WeeklyDigest[];
  onSaveDigest: (digest: WeeklyDigest) => Promise<void>;
}

export const WeeklyDigestView: React.FC<WeeklyDigestViewProps> = ({
  userId,
  entries,
  savedDigests,
  onSaveDigest,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDigest, setCurrentDigest] = useState<WeeklyDigest | null>(null);
  const [selectedPastDigestId, setSelectedPastDigestId] = useState<string | null>(null);

  // Filter entries to past 7 days
  const recent7DayEntries = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    return entries.filter((e) => (e.createdAt || 0) >= sevenDaysAgo);
  }, [entries]);

  // Compute dominant moods from past 7 days
  const dominantMoodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    recent7DayEntries.forEach((e) => {
      if (e.mood) counts[e.mood] = (counts[e.mood] || 0) + 1;
    });
    return Object.entries(counts).map(([mood, count]) => ({
      mood: mood as MoodType,
      count,
    }));
  }, [recent7DayEntries]);

  const startDateStr = useMemo(() => {
    const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const endDateStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  // Initialize with latest saved digest if available
  useEffect(() => {
    if (savedDigests.length > 0 && !currentDigest) {
      setCurrentDigest(savedDigests[0]);
      setSelectedPastDigestId(savedDigests[0].id);
    }
  }, [savedDigests, currentDigest]);

  // Generate fresh digest
  const handleGenerateDigest = async () => {
    if (recent7DayEntries.length === 0) {
      alert('No journal entries found in the past 7 days. Write at least one reflection to synthesize your weekly digest.');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateWeeklyDigestAI(recent7DayEntries, startDateStr, endDateStr);

      const newDigest: WeeklyDigest = {
        id: `digest_${Date.now()}`,
        userId,
        startDate: startDateStr,
        endDate: endDateStr,
        entryCount: recent7DayEntries.length,
        dominantMoods: dominantMoodCounts,
        keyThemes: result.keyThemes,
        growthHighlights: result.growthHighlights,
        recurringPatterns: result.recurringPatterns,
        actionablePrompts: result.actionablePrompts,
        executiveSummary: result.executiveSummary,
        generatedAt: Date.now(),
      };

      setCurrentDigest(newDigest);
      await onSaveDigest(newDigest);
    } catch (error) {
      console.error('Failed to generate weekly digest:', error);
      alert('Failed to generate weekly digest. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="weekly-digest-view" className="space-y-8 font-serif">
      {/* Top Header Card */}
      <div className="bg-white border border-[#EBE8E4] shadow-xs p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FAF9F6] text-[#1A1A1A] border border-[#EBE8E4] text-[10px] font-sans font-bold uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-[#1A1A1A]" />
            <span>7-Day Aggregation Window ({startDateStr} – {endDateStr})</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-light italic text-[#1A1A1A] tracking-tight">
            Automated Weekly Growth Digest
          </h2>
          <p className="text-xs sm:text-sm text-[#7D7A74] max-w-2xl leading-relaxed font-sans">
            Gemini synthesizes all reflections, sentiment transitions, and coaching interactions from your past week into high-level cognitive trends and tailored mindfulness exercises.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <button
            id="generate-weekly-digest-btn"
            onClick={handleGenerateDigest}
            disabled={isGenerating || recent7DayEntries.length === 0}
            className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#333] text-white text-[11px] font-sans font-bold uppercase tracking-widest shadow-xs flex items-center justify-center gap-2.5 transition disabled:opacity-40 cursor-pointer"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#C5A880]" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#C5A880]" />
            )}
            <span>{isGenerating ? 'Synthesizing Digest...' : 'Synthesize 7-Day Digest'}</span>
          </button>
        </div>
      </div>

      {/* 7-Day Quick Metric Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans">
        <div className="p-5 bg-white border border-[#EBE8E4] shadow-xs">
          <span className="text-[10px] font-bold text-[#A09D98] uppercase tracking-[0.2em]">Entries This Week</span>
          <p className="text-3xl font-light italic font-serif text-[#1A1A1A] mt-1">
            {recent7DayEntries.length} <span className="text-xs font-normal font-sans text-[#7D7A74]">reflections</span>
          </p>
        </div>

        <div className="p-5 bg-white border border-[#EBE8E4] shadow-xs">
          <span className="text-[10px] font-bold text-[#A09D98] uppercase tracking-[0.2em]">Dominant Sentiments</span>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {dominantMoodCounts.length > 0 ? (
              dominantMoodCounts.slice(0, 3).map((item) => (
                <span
                  key={item.mood}
                  className="text-[10px] px-2.5 py-0.5 bg-[#FAF9F6] border border-[#EBE8E4] text-[#1A1A1A] font-bold uppercase tracking-wider"
                >
                  {item.mood} ({item.count})
                </span>
              ))
            ) : (
              <span className="text-xs text-[#A09D98]">No entries in past 7 days</span>
            )}
          </div>
        </div>

        <div className="p-5 bg-white border border-[#EBE8E4] shadow-xs">
          <span className="text-[10px] font-bold text-[#A09D98] uppercase tracking-[0.2em]">Past Saved Digests</span>
          <p className="text-3xl font-light italic font-serif text-[#1A1A1A] mt-1">
            {savedDigests.length} <span className="text-xs font-normal font-sans text-[#7D7A74]">archived</span>
          </p>
        </div>
      </div>

      {/* Past Digest Selector Tabs */}
      {savedDigests.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin font-sans">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A09D98] shrink-0 flex items-center gap-1">
            <History className="w-3.5 h-3.5 text-[#A09D98]" /> Archive:
          </span>
          {savedDigests.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setSelectedPastDigestId(d.id);
                setCurrentDigest(d);
              }}
              className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 border transition cursor-pointer ${
                currentDigest?.id === d.id
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'bg-white text-[#7D7A74] border-[#EBE8E4] hover:bg-[#FAF9F6]'
              }`}
            >
              {d.startDate} – {d.endDate} ({d.entryCount} entries)
            </button>
          ))}
        </div>
      )}

      {/* Main Digest Display */}
      {currentDigest ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Executive Summary Card */}
          <div className="bg-white border border-[#EBE8E4] shadow-xs p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EBE8E4] pb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#1A1A1A]"></div>
                <h3 className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-[#1A1A1A]">
                  Weekly Executive Synthesis
                </h3>
              </div>
              <span className="text-[10px] font-sans uppercase tracking-wider text-[#A09D98] font-medium">
                Generated {new Date(currentDigest.generatedAt).toLocaleDateString()}
              </span>
            </div>

            <p className="text-base sm:text-lg text-[#1A1A1A] leading-relaxed italic whitespace-pre-wrap font-serif">
              "{currentDigest.executiveSummary}"
            </p>
          </div>

          {/* Grid: Themes & Growth Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Key Themes */}
            <div className="bg-white border border-[#EBE8E4] shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2 text-[#1A1A1A] border-b border-[#EBE8E4] pb-3">
                <Compass className="w-4 h-4 text-[#1A1A1A]" />
                <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">Top Life Themes & Focus Areas</h4>
              </div>
              <ul className="space-y-3 font-sans">
                {(currentDigest.keyThemes || []).map((theme, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs text-[#4A4844] leading-relaxed">
                    <span className="w-5 h-5 bg-[#FAF9F6] border border-[#EBE8E4] text-[#1A1A1A] font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {i + 1}
                    </span>
                    <span>{theme}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Growth Highlights */}
            <div className="bg-white border border-[#EBE8E4] shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2 text-[#1A1A1A] border-b border-[#EBE8E4] pb-3">
                <TrendingUp className="w-4 h-4 text-[#1A1A1A]" />
                <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">Breakthroughs & Resilience</h4>
              </div>
              <ul className="space-y-3 font-sans">
                {(currentDigest.growthHighlights || []).map((highlight, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-[#4A4844] leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-[#1A1A1A] shrink-0 mt-0.5" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Grid: Recurring Patterns & Tailored Prompts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recurring Cognitive Patterns */}
            <div className="bg-white border border-[#EBE8E4] shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2 text-[#1A1A1A] border-b border-[#EBE8E4] pb-3">
                <Zap className="w-4 h-4 text-[#1A1A1A]" />
                <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">Observed Emotional Triggers & Habits</h4>
              </div>
              <ul className="space-y-2.5 font-sans">
                {(currentDigest.recurringPatterns || []).map((pattern, i) => (
                  <li key={i} className="p-3.5 bg-[#FAF9F6] border border-[#EBE8E4] text-xs text-[#4A4844] leading-relaxed">
                    {pattern}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tailored Mindfulness Prompts for Next Week */}
            <div className="bg-white border border-[#1A1A1A] shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2 text-[#1A1A1A] border-b border-[#EBE8E4] pb-3">
                <Lightbulb className="w-4 h-4 text-[#1A1A1A]" />
                <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">Actionable Prompts for Next Week</h4>
              </div>
              <div className="space-y-3">
                {(currentDigest.actionablePrompts || []).map((prompt, i) => (
                  <div
                    key={i}
                    className="p-4 bg-[#FAF9F6] border border-[#EBE8E4] text-xs text-[#1A1A1A] leading-relaxed"
                  >
                    <span className="font-sans font-bold text-[9px] uppercase tracking-widest text-[#A09D98] block mb-1">
                      Reflection Prompt 0{i + 1}
                    </span>
                    <p className="font-serif italic text-sm text-[#1A1A1A]">"{prompt}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#EBE8E4] p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-[#FAF9F6] border border-[#EBE8E4] text-[#1A1A1A] flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5 text-[#A09D98]" />
          </div>
          <h3 className="text-lg font-light italic text-[#1A1A1A]">No Weekly Digest Generated Yet</h3>
          <p className="text-xs font-sans text-[#7D7A74] max-w-md mx-auto leading-relaxed">
            {recent7DayEntries.length > 0
              ? `You have ${recent7DayEntries.length} reflection(s) logged in the past 7 days. Click the button above to synthesize your weekly insights.`
              : 'Write a few reflections throughout the week to generate comprehensive AI summaries, emotional trend maps, and future prompts.'}
          </p>
        </div>
      )}
    </div>
  );
};
