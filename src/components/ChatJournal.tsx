import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  Save, 
  Bot, 
  User as UserIcon, 
  Tag, 
  Smile, 
  Zap, 
  RotateCcw, 
  Lightbulb, 
  Check, 
  MessageSquare,
  FileText,
  Clock,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import type { JournalEntry, ChatMessage, MoodType } from '../types';
import { sendCoachMessage, analyzeJournalEntry } from '../services/aiService';

interface ChatJournalProps {
  userId: string;
  onSaveEntry: (entry: JournalEntry) => Promise<void>;
  existingEntry?: JournalEntry | null;
  onClearActiveEntry?: () => void;
}

const PROMPT_SUGGESTIONS = [
  { label: 'Energy Audit', prompt: 'What gave me genuine energy today, and what silently drained me?' },
  { label: 'Cognitive Reframe', prompt: 'What felt difficult today, and what is one constructive lesson hidden in it?' },
  { label: 'Deep Gratitude', prompt: 'Name three specific, small moments today that made me pause in gratitude.' },
  { label: 'Unspoken Feeling', prompt: 'What emotion am I currently resisting or avoiding acknowledging?' },
  { label: 'Boundary Setting', prompt: 'Where do I need to establish a firmer or kinder boundary for my peace of mind?' },
];

const AVAILABLE_MOODS: MoodType[] = [
  'Reflective',
  'Anxious',
  'Grateful',
  'Motivated',
  'Peaceful',
  'Challenged',
  'Joyful',
  'Overwhelmed',
  'Empowered',
];

export const ChatJournal: React.FC<ChatJournalProps> = ({
  userId,
  onSaveEntry,
  existingEntry,
  onClearActiveEntry,
}) => {
  const [title, setTitle] = useState(existingEntry?.title || '');
  const [content, setContent] = useState(existingEntry?.content || '');
  const [messages, setMessages] = useState<ChatMessage[]>(
    existingEntry?.conversation && existingEntry.conversation.length > 0
      ? existingEntry.conversation
      : [
          {
            id: 'welcome-1',
            role: 'assistant',
            content: "Hello. I'm your reflection coach. What's on your mind today? Feel free to write freely in your journal, or share a thought here.",
            timestamp: Date.now(),
          },
        ]
  );
  const [inputMessage, setInputMessage] = useState('');
  const [isCoachThinking, setIsCoachThinking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Extracted Metadata State
  const [selectedMood, setSelectedMood] = useState<MoodType>(existingEntry?.mood || 'Reflective');
  const [sentimentScore, setSentimentScore] = useState<number>(existingEntry?.sentimentScore || 0.2);
  const [tags, setTags] = useState<string[]>(existingEntry?.tags || ['Reflection', 'Self-Awareness']);
  const [newTagInput, setNewTagInput] = useState('');
  const [summary, setSummary] = useState(existingEntry?.summary || '');
  const [growthTakeaway, setGrowthTakeaway] = useState(existingEntry?.growthTakeaway || '');
  const [energyLevel, setEnergyLevel] = useState<'Low' | 'Medium' | 'High'>(existingEntry?.energyLevel || 'Medium');
  const [analysisDone, setAnalysisDone] = useState(Boolean(existingEntry?.summary));

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (existingEntry) {
      setTitle(existingEntry.title || '');
      setContent(existingEntry.content || '');
      setMessages(existingEntry.conversation || []);
      setSelectedMood(existingEntry.mood || 'Reflective');
      setSentimentScore(existingEntry.sentimentScore ?? 0.2);
      setTags(existingEntry.tags || []);
      setSummary(existingEntry.summary || '');
      setGrowthTakeaway(existingEntry.growthTakeaway || '');
      setEnergyLevel(existingEntry.energyLevel || 'Medium');
      setAnalysisDone(true);
    }
  }, [existingEntry]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isCoachThinking]);

  // Handle sending a chat message to Gemini reflection coach
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isCoachThinking) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage('');
    setIsCoachThinking(true);

    try {
      const response = await sendCoachMessage(newMessages, content, title);
      const coachMsg: ChatMessage = {
        id: `coach-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: Date.now(),
      };
      setMessages([...newMessages, coachMsg]);
    } catch (error: any) {
      console.error('Failed to get coach response:', error);
      const fallbackMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'I noticed a temporary connection hiccup, but I am holding space for your reflection. What thought feels most vital to write down next?',
        timestamp: Date.now(),
      };
      setMessages([...newMessages, fallbackMsg]);
    } finally {
      setIsCoachThinking(false);
    }
  };

  // Automated Metadata Extraction
  const handleAnalyzeAndExtract = async () => {
    if (!content.trim() && messages.length <= 1) {
      alert('Please write some journal content or engage in conversation with your coach first.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeJournalEntry(
        title || 'Daily Reflection',
        content,
        messages.filter((m) => m.id !== 'welcome-1')
      );

      setSelectedMood(result.sentiment);
      setSentimentScore(result.sentimentScore);
      setTags(result.tags);
      setSummary(result.summary);
      setGrowthTakeaway(result.growthTakeaway);
      setEnergyLevel(result.energyLevel);
      setAnalysisDone(true);
    } catch (error) {
      console.error('Metadata extraction error:', error);
      // Fallback extraction
      setSelectedMood('Reflective');
      setTags(['Reflection', 'Personal Growth', 'Mindfulness']);
      setSummary('A meaningful reflective session capturing thoughts, emotions, and mindful insights.');
      setGrowthTakeaway('Continuous reflection strengthens emotional resilience and self-awareness.');
      setAnalysisDone(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save journal entry to Firestore under /users/{userId}/journal_entries/{entryId}
  const handleSaveEntry = async () => {
    if (!content.trim() && messages.length <= 1) {
      alert('Please write some journal content before saving.');
      return;
    }

    setIsSaving(true);
    const now = Date.now();
    const dateObj = new Date(now);
    const dateStr = dateObj.toISOString().split('T')[0];

    const entryToSave: JournalEntry = {
      id: existingEntry?.id || `entry_${now}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      title: title.trim() || `Reflection on ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      content: content.trim(),
      createdAt: existingEntry?.createdAt || now,
      updatedAt: now,
      dateStr,
      mood: selectedMood,
      sentimentScore,
      tags: tags.length > 0 ? tags : ['General Reflection'],
      summary: summary || 'A self-reflection session with personal observations.',
      growthTakeaway: growthTakeaway || 'Taking time to pause and write creates space for emotional clarity.',
      energyLevel,
      wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
      conversation: messages,
    };

    try {
      await onSaveEntry(entryToSave);
      setAnalysisDone(true);
    } catch (err) {
      console.error('Failed to save entry:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset or Start New Entry
  const handleStartFresh = () => {
    if (confirm('Start a fresh journal entry? Unsaved text will be cleared.')) {
      setTitle('');
      setContent('');
      setMessages([
        {
          id: 'welcome-1',
          role: 'assistant',
          content: "Hello. I'm your reflection coach. What's on your mind today?",
          timestamp: Date.now(),
        },
      ]);
      setSelectedMood('Reflective');
      setTags(['Reflection', 'Self-Awareness']);
      setSummary('');
      setGrowthTakeaway('');
      setAnalysisDone(false);
      if (onClearActiveEntry) onClearActiveEntry();
    }
  };

  // Add tag manually
  const handleAddTag = () => {
    if (newTagInput.trim() && !tags.includes(newTagInput.trim())) {
      setTags([...tags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div id="chat-journal-container" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-serif">
      {/* LEFT COLUMN: Main Journal Writing Canvas & Metadata Review (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Main Editor Card */}
        <div className="bg-white border border-[#EBE8E4] shadow-xs">
          {/* Editor Header */}
          <div className="p-5 border-b border-[#EBE8E4] bg-[#FAF9F6] flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-[#A09D98]">
                {existingEntry ? 'Revise Reflection' : 'Drafting Reflection'}
              </span>
              <h2 className="text-xl font-light italic text-[#1A1A1A] leading-tight mt-0.5">
                {existingEntry ? existingEntry.title || 'Untitled Session' : 'Reflect on your technical journey...'}
              </h2>
              <div className="flex items-center gap-3 text-[10px] font-sans uppercase tracking-wider text-[#7D7A74] mt-1 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#A09D98]" />
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span>•</span>
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{charCount} chars</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {existingEntry && (
                <button
                  id="new-entry-reset-btn"
                  onClick={handleStartFresh}
                  className="px-3.5 py-2 border border-[#EBE8E4] bg-white hover:bg-[#FAF9F6] text-[#4A4844] text-[10px] font-sans font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  New Entry
                </button>
              )}
              <button
                id="save-journal-entry-btn"
                onClick={handleSaveEntry}
                disabled={isSaving}
                className="px-5 py-2 bg-[#1A1A1A] hover:bg-[#333] text-white text-[11px] font-sans font-bold uppercase tracking-widest flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-white" />
                <span>{isSaving ? 'Saving...' : 'Save Reflection'}</span>
              </button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Title Input */}
            <div>
              <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#A09D98] mb-1.5">
                Reflection Title
              </label>
              <input
                id="journal-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give this reflection a title (e.g., Navigating architectural shifts in Q4)..."
                className="w-full text-lg sm:text-2xl font-light italic text-[#1A1A1A] placeholder:text-[#B5B2AD] border-b border-[#EBE8E4] hover:border-[#A09D98] focus:border-[#1A1A1A] focus:outline-none pb-2 transition bg-transparent"
              />
            </div>

            {/* Prompt Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
              <span className="text-[10px] font-sans font-bold text-[#A09D98] uppercase tracking-[0.2em] shrink-0 flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-[#1A1A1A]" /> Prompts:
              </span>
              {PROMPT_SUGGESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (!content) setContent(item.prompt + '\n\n');
                    else setContent(content + '\n\n' + item.prompt + '\n');
                  }}
                  className="shrink-0 text-[10px] font-sans font-medium px-2.5 py-1 bg-[#FAF9F6] hover:bg-[#F3F2EF] text-[#4A4844] border border-[#EBE8E4] transition cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Journal Content Textarea */}
            <div>
              <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#A09D98] mb-1.5">
                Journal Body
              </label>
              <textarea
                id="journal-content-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your thoughts freely. Your reflection coach will read along and guide you, or you can extract insights when ready..."
                rows={10}
                className="w-full p-5 border border-[#EBE8E4] bg-[#FAF9F6] text-[#1A1A1A] text-base font-serif italic leading-relaxed focus:bg-white focus:outline-none focus:border-[#1A1A1A] resize-y transition placeholder:text-[#B5B2AD]"
              />
            </div>

            {/* Action Bar for AI Metadata Extraction */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EBE8E4]">
              <button
                id="extract-insights-btn"
                onClick={handleAnalyzeAndExtract}
                disabled={isAnalyzing}
                className="px-5 py-2.5 bg-[#FAF9F6] hover:bg-[#F3F2EF] text-[#1A1A1A] border border-[#EBE8E4] text-[11px] font-sans font-bold uppercase tracking-widest flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#1A1A1A]" />
                <span>{isAnalyzing ? 'Extracting Insights...' : 'Extract Insights with Gemini'}</span>
              </button>

              <span className="text-[10px] font-sans uppercase tracking-wider text-[#A09D98]">
                Structured JSON schema extraction
              </span>
            </div>
          </div>
        </div>

        {/* Extracted Metadata Card */}
        {analysisDone && (
          <div id="extracted-insights-card" className="bg-white border border-[#EBE8E4] shadow-xs p-6 space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#EBE8E4] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1A1A1A]"></span>
                <h3 className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-[#A09D98]">
                  Extracted Emotional & Cognitive Insights
                </h3>
              </div>
              <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#7D7A74] bg-[#FAF9F6] border border-[#EBE8E4] px-2 py-0.5">
                Gemini Schema Validated
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Mood Selector */}
              <div className="space-y-2">
                <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#A09D98]">
                  Primary Sentiment / Mood
                </label>
                <select
                  id="entry-mood-select"
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value as MoodType)}
                  className="w-full px-3 py-2 border border-[#EBE8E4] bg-[#FAF9F6] text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                >
                  {AVAILABLE_MOODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Energy Level */}
              <div className="space-y-2">
                <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#A09D98]">
                  Energy Level
                </label>
                <div className="flex items-center gap-2">
                  {(['Low', 'Medium', 'High'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEnergyLevel(lvl)}
                      className={`flex-1 py-1.5 text-[11px] font-sans font-bold uppercase tracking-wider border transition cursor-pointer ${
                        energyLevel === lvl
                          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                          : 'bg-[#FAF9F6] text-[#7D7A74] border-[#EBE8E4] hover:bg-[#F3F2EF]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tags Cloud & Input */}
            <div className="space-y-2">
              <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#A09D98]">
                Topic Tags
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-sans font-medium bg-[#FAF9F6] text-[#7D7A74] border border-[#EBE8E4]"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-[#A09D98] hover:text-[#1A1A1A] ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add tag..."
                  className="px-3 py-1.5 border border-[#EBE8E4] text-[11px] font-sans bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#1A1A1A]"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3.5 py-1.5 bg-[#FAF9F6] hover:bg-[#F3F2EF] border border-[#EBE8E4] text-[#1A1A1A] text-[10px] font-sans font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  Add Tag
                </button>
              </div>
            </div>

            {/* Reflection Summary & Growth Takeaway */}
            {summary && (
              <div className="p-4 bg-[#FAF9F6] border border-[#EBE8E4] text-xs text-[#4A4844] space-y-1">
                <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                  Synthesis:
                </div>
                <p className="leading-relaxed italic">{summary}</p>
              </div>
            )}

            {growthTakeaway && (
              <div className="p-5 bg-white border border-[#1A1A1A] text-xs text-[#1A1A1A] space-y-1 shadow-xs">
                <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                  Actionable Growth Takeaway:
                </div>
                <p className="text-sm font-serif italic leading-relaxed text-[#4A4844]">"{growthTakeaway}"</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Interactive Multi-Turn Reflection Coach (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white border border-[#EBE8E4] shadow-xs flex flex-col h-[680px]">
          {/* Coach Header */}
          <div className="p-5 bg-[#FAF9F6] border-b border-[#EBE8E4] flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-[#1A1A1A]"></div>
                <h3 className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-[#1A1A1A]">
                  Gemini 3.6 Flash
                </h3>
              </div>
              <p className="text-sm font-bold text-[#1A1A1A] mt-0.5">ReflectAI Coach Dialogue</p>
            </div>
            <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#7D7A74] bg-white border border-[#EBE8E4] px-2 py-0.5">
              Socratic Mentor
            </span>
          </div>

          {/* Chat Messages Log */}
          <div id="coach-messages-scroll" className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FDFCFB]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-sans uppercase tracking-wider text-[#A09D98]">
                  <span>{msg.role === 'user' ? 'You' : 'Coach (Gemini)'}</span>
                  <span>•</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div
                  className={`p-5 text-sm leading-relaxed shadow-xs max-w-[90%] ${
                    msg.role === 'user'
                      ? 'bg-white border border-[#EBE8E4] text-[#1A1A1A] italic'
                      : 'bg-[#FAF9F6] border border-[#EBE8E4] text-[#4A4844]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isCoachThinking && (
              <div className="flex items-center gap-2 text-xs text-[#7D7A74] italic p-4 bg-[#FAF9F6] border border-[#EBE8E4]">
                <div className="w-2 h-2 rounded-full bg-[#1A1A1A] animate-pulse"></div>
                <span>The coach is considering your reflection...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick reflection starter buttons */}
          <div className="px-5 py-2.5 border-t border-[#EBE8E4] bg-[#FAF9F6] flex items-center gap-2 overflow-x-auto scrollbar-thin">
            <button
              onClick={() => {
                setInputMessage("I'm feeling stuck on a decision today. Can you help me unpack it?");
              }}
              className="shrink-0 text-[10px] font-sans font-medium px-2.5 py-1 bg-white hover:bg-[#F3F2EF] text-[#4A4844] border border-[#EBE8E4] transition cursor-pointer"
            >
              Unpack a decision
            </button>
            <button
              onClick={() => {
                setInputMessage('Can you help me reframe this anxious feeling constructively?');
              }}
              className="shrink-0 text-[10px] font-sans font-medium px-2.5 py-1 bg-white hover:bg-[#F3F2EF] text-[#4A4844] border border-[#EBE8E4] transition cursor-pointer"
            >
              Reframe anxiety
            </button>
            <button
              onClick={() => {
                setInputMessage('What Socratic question should I ask myself right now?');
              }}
              className="shrink-0 text-[10px] font-sans font-medium px-2.5 py-1 bg-white hover:bg-[#F3F2EF] text-[#4A4844] border border-[#EBE8E4] transition cursor-pointer"
            >
              Socratic question
            </button>
          </div>

          {/* Chat Input Form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-[#1A1A1A] bg-white flex items-center">
            <input
              id="coach-chat-input"
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Reflect with your coach..."
              disabled={isCoachThinking}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-serif italic outline-none placeholder:text-[#B5B2AD] text-[#1A1A1A]"
            />
            <button
              id="send-coach-message-btn"
              type="submit"
              disabled={!inputMessage.trim() || isCoachThinking}
              className="ml-3 px-6 py-2 bg-[#1A1A1A] hover:bg-[#333] text-white font-sans text-[11px] font-bold uppercase tracking-widest transition cursor-pointer disabled:opacity-40"
              aria-label="Send message to reflection coach"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
