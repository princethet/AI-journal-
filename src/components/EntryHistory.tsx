import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  Filter, 
  Trash2, 
  Edit3, 
  Tag, 
  Smile, 
  Sparkles, 
  MessageSquare, 
  ArrowUpRight, 
  Download, 
  Clock, 
  Flame,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import type { JournalEntry, MoodType, FilterState } from '../types';

interface EntryHistoryProps {
  entries: JournalEntry[];
  onSelectEntryForEdit: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onNewEntryClick: () => void;
}

const MOOD_COLOR_MAP: Record<MoodType, { bg: string; text: string; border: string }> = {
  Reflective: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  Anxious: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Grateful: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Motivated: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Peaceful: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  Challenged: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  Joyful: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  Overwhelmed: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  Empowered: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
};

export const EntryHistory: React.FC<EntryHistoryProps> = ({
  entries,
  onSelectEntryForEdit,
  onDeleteEntry,
  onNewEntryClick,
}) => {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(
    entries.length > 0 ? entries[0].id : null
  );

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedMood: 'all',
    selectedTag: 'all',
    dateRange: 'all',
    sortBy: 'newest',
  });

  // Extract unique tags and moods across all entries
  const allUniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((e) => (e.tags || []).forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }, [entries]);

  const allUniqueMoods = useMemo(() => {
    const moodSet = new Set<string>();
    entries.forEach((e) => e.mood && moodSet.add(e.mood));
    return Array.from(moodSet);
  }, [entries]);

  // Filter & Search Logic
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // 1. Search Query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = entry.title.toLowerCase().includes(query);
        const matchesContent = entry.content.toLowerCase().includes(query);
        const matchesTags = (entry.tags || []).some((t) => t.toLowerCase().includes(query));
        const matchesTakeaway = (entry.growthTakeaway || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesContent && !matchesTags && !matchesTakeaway) {
          return false;
        }
      }

      // 2. Mood Filter
      if (filters.selectedMood !== 'all' && entry.mood !== filters.selectedMood) {
        return false;
      }

      // 3. Tag Filter
      if (filters.selectedTag !== 'all' && !(entry.tags || []).includes(filters.selectedTag)) {
        return false;
      }

      // 4. Date Range Filter
      if (filters.dateRange !== 'all') {
        const now = Date.now();
        const entryTime = entry.createdAt || entry.updatedAt || now;
        const diffDays = (now - entryTime) / (1000 * 60 * 60 * 24);

        if (filters.dateRange === 'today' && diffDays > 1) return false;
        if (filters.dateRange === '7days' && diffDays > 7) return false;
        if (filters.dateRange === '30days' && diffDays > 30) return false;
      }

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === 'oldest') {
        return (a.createdAt || 0) - (b.createdAt || 0);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [entries, filters]);

  // Active selected entry
  const activeEntry = useMemo(() => {
    if (!selectedEntryId) return filteredEntries[0] || null;
    return entries.find((e) => e.id === selectedEntryId) || filteredEntries[0] || null;
  }, [entries, filteredEntries, selectedEntryId]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalWords = entries.reduce((acc, curr) => acc + (curr.wordCount || 0), 0);
    const moodCounts: Record<string, number> = {};
    entries.forEach((e) => {
      if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    });
    return {
      totalEntries: entries.length,
      totalWords,
      topMood: Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Reflective',
    };
  }, [entries]);

  // Export entry as Markdown
  const handleExportMarkdown = (entry: JournalEntry) => {
    const md = `# ${entry.title}
Date: ${new Date(entry.createdAt).toLocaleDateString()}
Mood: ${entry.mood} (Energy: ${entry.energyLevel})
Tags: ${(entry.tags || []).join(', ')}

## Reflection
${entry.content}

## Growth Takeaway
${entry.growthTakeaway || 'None'}

## Coaching Dialogue
${(entry.conversation || [])
  .map((m) => `**${m.role === 'user' ? 'You' : 'Coach'}**: ${m.content}`)
  .join('\n\n')}
`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entry.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'reflection'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="entry-history-view" className="space-y-6 font-serif">
      {/* Top Stats & Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-[#EBE8E4] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-sans font-bold text-[#A09D98] uppercase tracking-[0.2em]">Total Reflections</p>
            <p className="text-3xl font-light italic text-[#1A1A1A] mt-1">{stats.totalEntries}</p>
          </div>
          <div className="w-10 h-10 bg-[#FAF9F6] border border-[#EBE8E4] text-[#1A1A1A] flex items-center justify-center font-sans font-bold text-xs">
            <Calendar className="w-4 h-4 text-[#1A1A1A]" />
          </div>
        </div>

        <div className="p-5 bg-white border border-[#EBE8E4] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-sans font-bold text-[#A09D98] uppercase tracking-[0.2em]">Words Journaled</p>
            <p className="text-3xl font-light italic text-[#1A1A1A] mt-1">{stats.totalWords.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 bg-[#FAF9F6] border border-[#EBE8E4] text-[#1A1A1A] flex items-center justify-center font-sans font-bold text-xs">
            <Flame className="w-4 h-4 text-[#1A1A1A]" />
          </div>
        </div>

        <div className="p-5 bg-white border border-[#EBE8E4] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-sans font-bold text-[#A09D98] uppercase tracking-[0.2em]">Dominant State</p>
            <p className="text-2xl font-light italic text-[#1A1A1A] mt-1">{stats.topMood}</p>
          </div>
          <div className="w-10 h-10 bg-[#FAF9F6] border border-[#EBE8E4] text-[#1A1A1A] flex items-center justify-center font-sans font-bold text-xs">
            <Smile className="w-4 h-4 text-[#1A1A1A]" />
          </div>
        </div>
      </div>

      {/* Main Filter & Search Control Panel */}
      <div className="p-5 bg-white border border-[#EBE8E4] shadow-xs space-y-3 font-sans">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Bar (5 cols) */}
          <div className="sm:col-span-5 relative">
            <Search className="w-3.5 h-3.5 text-[#A09D98] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="history-search-input"
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              placeholder="Search by keywords, insights, or tags..."
              className="w-full pl-9 pr-4 py-2 border border-[#EBE8E4] bg-[#FAF9F6] text-xs text-[#1A1A1A] placeholder:text-[#B5B2AD] focus:bg-white focus:outline-none focus:border-[#1A1A1A] transition"
            />
          </div>

          {/* Mood Filter (3 cols) */}
          <div className="sm:col-span-3">
            <select
              id="filter-mood-select"
              value={filters.selectedMood}
              onChange={(e) => setFilters({ ...filters, selectedMood: e.target.value })}
              className="w-full px-3 py-2 border border-[#EBE8E4] bg-[#FAF9F6] text-xs font-bold uppercase tracking-wider text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
            >
              <option value="all">All Sentiments</option>
              {allUniqueMoods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Filter (2 cols) */}
          <div className="sm:col-span-2">
            <select
              id="filter-tag-select"
              value={filters.selectedTag}
              onChange={(e) => setFilters({ ...filters, selectedTag: e.target.value })}
              className="w-full px-3 py-2 border border-[#EBE8E4] bg-[#FAF9F6] text-xs font-bold uppercase tracking-wider text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
            >
              <option value="all">All Tags</option>
              {allUniqueTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range (2 cols) */}
          <div className="sm:col-span-2">
            <select
              id="filter-date-select"
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
              className="w-full px-3 py-2 border border-[#EBE8E4] bg-[#FAF9F6] text-xs font-bold uppercase tracking-wider text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Past 7 Days</option>
              <option value="30days">Past 30 Days</option>
            </select>
          </div>
        </div>

        {/* Tag Cloud Shortcut Chips */}
        {allUniqueTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-thin">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A09D98] shrink-0">Filter Tag:</span>
            <button
              onClick={() => setFilters({ ...filters, selectedTag: 'all' })}
              className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 border transition cursor-pointer ${
                filters.selectedTag === 'all'
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'bg-[#FAF9F6] text-[#7D7A74] border-[#EBE8E4] hover:bg-[#F3F2EF]'
              }`}
            >
              All
            </button>
            {allUniqueTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilters({ ...filters, selectedTag: tag })}
                className={`text-[10px] font-medium px-2.5 py-1 border shrink-0 transition cursor-pointer ${
                  filters.selectedTag === tag
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                    : 'bg-[#FAF9F6] text-[#7D7A74] border-[#EBE8E4] hover:bg-[#F3F2EF]'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Two-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT LIST: Entry Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-3 max-h-[720px] overflow-y-auto pr-1 scrollbar-thin">
          {filteredEntries.length === 0 ? (
            <div className="bg-white border border-[#EBE8E4] p-8 text-center space-y-3">
              <div className="w-12 h-12 bg-[#FAF9F6] border border-[#EBE8E4] text-[#1A1A1A] flex items-center justify-center mx-auto">
                <Search className="w-5 h-5 text-[#A09D98]" />
              </div>
              <h4 className="text-base font-light italic text-[#1A1A1A]">No matching reflections</h4>
              <p className="text-xs text-[#7D7A74] max-w-xs mx-auto leading-relaxed">
                {entries.length === 0
                  ? 'You have not written any journal entries yet. Click below to start your first reflection.'
                  : 'No entries match your search criteria. Try clearing some filters.'}
              </p>
              {entries.length === 0 && (
                <button
                  id="empty-state-new-entry-btn"
                  onClick={onNewEntryClick}
                  className="mt-2 px-5 py-2 bg-[#1A1A1A] hover:bg-[#333] text-white text-[11px] font-sans font-bold uppercase tracking-widest transition cursor-pointer"
                >
                  Write First Reflection
                </button>
              )}
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isSelected = activeEntry?.id === entry.id;

              return (
                <div
                  key={entry.id}
                  id={`entry-card-${entry.id}`}
                  onClick={() => setSelectedEntryId(entry.id)}
                  className={`p-5 border transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[#FAF9F6] border-[#1A1A1A]'
                      : 'bg-white border-[#EBE8E4] hover:border-[#A09D98]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-base font-light italic text-[#1A1A1A] line-clamp-1">
                      {entry.title || 'Untitled Reflection'}
                    </h3>
                    <span className="text-[9px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 bg-white border border-[#EBE8E4] text-[#2B5A82] shrink-0">
                      {entry.mood}
                    </span>
                  </div>

                  <p className="text-xs text-[#4A4844] line-clamp-2 leading-relaxed mb-3">
                    {entry.summary || entry.content}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-sans uppercase tracking-wider text-[#A09D98] pt-2 border-t border-[#EBE8E4]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(entry.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>

                    <div className="flex items-center gap-1.5 overflow-hidden max-w-[180px]">
                      {(entry.tags || []).slice(0, 2).map((t, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-[#FAF9F6] border border-[#EBE8E4] text-[#7D7A74] truncate">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT DETAIL: Detailed Entry Inspector & Transcript (7 cols) */}
        <div className="lg:col-span-7">
          {activeEntry ? (
            <div className="bg-white border border-[#EBE8E4] shadow-xs p-6 sm:p-8 space-y-6 animate-fadeIn">
              {/* Header Details */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EBE8E4] pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-sans font-bold uppercase tracking-wider px-2.5 py-0.5 bg-[#FAF9F6] border border-[#EBE8E4] text-[#2B5A82]">
                      {activeEntry.mood}
                    </span>
                    <span className="text-[10px] font-sans uppercase tracking-wider text-[#A09D98]">
                      Energy: <strong className="text-[#1A1A1A]">{activeEntry.energyLevel}</strong>
                    </span>
                  </div>
                  <h2 className="text-2xl font-light italic text-[#1A1A1A] leading-tight">{activeEntry.title}</h2>
                  <p className="text-[10px] font-sans uppercase tracking-wider text-[#A09D98] mt-1.5 flex items-center gap-2">
                    <span>
                      {new Date(activeEntry.createdAt).toLocaleString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>•</span>
                    <span>{activeEntry.wordCount} words</span>
                  </p>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-2">
                  <button
                    id="edit-entry-btn"
                    onClick={() => onSelectEntryForEdit(activeEntry)}
                    className="px-4 py-2 border border-[#EBE8E4] bg-white hover:bg-[#FAF9F6] text-[#1A1A1A] text-[10px] font-sans font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                    title="Load in Journal Editor"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#1A1A1A]" />
                    <span>Continue / Edit</span>
                  </button>

                  <button
                    id="export-entry-btn"
                    onClick={() => handleExportMarkdown(activeEntry)}
                    className="p-2 border border-[#EBE8E4] bg-white hover:bg-[#FAF9F6] text-[#7D7A74] hover:text-[#1A1A1A] transition cursor-pointer"
                    title="Export as Markdown"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    id="delete-entry-btn"
                    onClick={() => {
                      if (confirm(`Are you sure you want to permanently delete "${activeEntry.title}"?`)) {
                        onDeleteEntry(activeEntry.id);
                      }
                    }}
                    className="p-2 border border-[#EBE8E4] bg-white hover:bg-[#FAF9F6] text-[#7D7A74] hover:text-[#1A1A1A] transition cursor-pointer"
                    title="Delete reflection"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tags Cloud */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(activeEntry.tags || []).map((t, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-sans px-2.5 py-0.5 bg-[#FAF9F6] text-[#7D7A74] border border-[#EBE8E4]"
                  >
                    #{t}
                  </span>
                ))}
              </div>

              {/* Growth Takeaway Banner */}
              {activeEntry.growthTakeaway && (
                <div className="p-5 bg-white border border-[#1A1A1A] text-xs text-[#1A1A1A] space-y-1 shadow-xs">
                  <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                    Actionable Growth Insight
                  </div>
                  <p className="text-sm font-serif italic text-[#4A4844] leading-relaxed">
                    "{activeEntry.growthTakeaway}"
                  </p>
                </div>
              )}

              {/* Reflection Written Body */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#A09D98]">
                  Journal Reflection Text
                </h3>
                <div className="p-6 bg-[#FAF9F6] border border-[#EBE8E4] text-sm text-[#1A1A1A] leading-relaxed italic font-serif whitespace-pre-wrap">
                  {activeEntry.content || '(No additional text written)'}
                </div>
              </div>

              {/* Coaching Multi-turn Transcript */}
              {activeEntry.conversation && activeEntry.conversation.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-[#EBE8E4]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#1A1A1A]"></div>
                    <h3 className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-[#1A1A1A]">
                      AI Coach Multi-Turn Dialogue
                    </h3>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                    {activeEntry.conversation.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 text-xs leading-relaxed border border-[#EBE8E4] ${
                          msg.role === 'assistant'
                            ? 'bg-[#FAF9F6] text-[#4A4844]'
                            : 'bg-white text-[#1A1A1A] italic'
                        }`}
                      >
                        <p className="text-[9px] font-sans uppercase tracking-wider text-[#A09D98] mb-1">
                          {msg.role === 'assistant' ? 'ReflectAI Coach' : 'You'}
                        </p>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#EBE8E4] p-12 text-center text-[#7D7A74] text-xs">
              Select a reflection on the left to inspect detailed insights and coaching dialogue.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
