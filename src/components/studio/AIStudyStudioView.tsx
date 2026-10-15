import React, { useMemo, useState } from 'react';
import { StudentProfile } from '../../types';
import { offlineStorage } from '../../services/offlineStorage';
import {
  FileText,
  Layers,
  Sparkles,
  Bookmark,
  Share2,
  Download,
  BookOpen,
  CheckCircle2,
  Cpu,
  RotateCw,
  HelpCircle,
  Copy,
  Video,
  Network,
  PlayCircle,
  ExternalLink
} from 'lucide-react';

interface AIStudyStudioViewProps {
  profile: StudentProfile;
  activeSubject: string;
}

type StudioContentType = 'short_notes' | 'summary' | 'flashcards' | 'formulas' | 'mindmap' | 'vocab';

export const AIStudyStudioView: React.FC<AIStudyStudioViewProps> = ({ profile, activeSubject }) => {
  const [contentType, setContentType] = useState<StudioContentType>('short_notes');
  const [topic, setTopic] = useState('Electricity and Circuits');
  const [mindMapEntries, setMindMapEntries] = useState('Main idea\nKey concepts\nExamples\nImportant formulas');
  const [targetLang, setTargetLang] = useState(profile.tutorLanguage || 'Odia');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [flashcardFlipped, setFlashcardFlipped] = useState<number | null>(null);

  const mindMapBranches = useMemo(() => mindMapEntries.split(/[\n,;]+/).map((entry) => entry.trim()).filter(Boolean).slice(0, 12), [mindMapEntries]);
  const videoSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`Class ${profile.classNum} ${activeSubject} ${topic} lesson`)}`;
  const conceptVideoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${activeSubject} ${topic} explanation for students`)}`;
  const revisionVideoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`Class ${profile.classNum} ${activeSubject} ${topic} revision`)}`;

  const sampleFlashcards = [
    { q: "What is Ohm's Law formula?", a: "V = I × R (Voltage = Current × Resistance)" },
    { q: "What is the SI unit of Electric Charge?", a: "Coulomb (C)" },
    { q: "What is the function of Chlorophyll in plants?", a: "Absorbs solar light energy to drive photosynthesis" },
    { q: "How is an ammeter connected in an electric circuit?", a: "Always in SERIES to measure the full current" }
  ];

  const handleGenerate = async () => {
    if (!topic) return;
    setIsGenerating(true);
    setGeneratedContent(null);

    try {
      const res = await fetch('/api/gemini/study-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: contentType,
          topic: contentType === 'mindmap' ? `${topic}. Build the mind map using these student-provided entries and connect them logically: ${mindMapEntries}` : topic,
          classNum: profile.classNum,
          subject: activeSubject,
          language: targetLang
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `AI generation failed (HTTP ${res.status})`);
      if (typeof data.content !== 'string' || !data.content.trim()) {
        throw new Error('The live AI returned an empty response. Please try again.');
      }
      setGeneratedContent(data.content);
    } catch (e) {
      console.error('Live Study Studio request failed:', e);
      setGeneratedContent(`LIVE AI ERROR: ${e instanceof Error ? e.message : 'Unknown network or server error'}. No offline sample was substituted. Please check the backend and Gemini configuration, then try again.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToOfflineNotes = async () => {
    if (!generatedContent || generatedContent.startsWith('LIVE AI ERROR:')) return;
    try {
      await offlineStorage.saveNote({
        id: `studio-note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: `${contentType.toUpperCase()}: ${topic}`,
        topic,
        content: generatedContent,
        subject: activeSubject,
        classNum: Number(profile.classNum),
        createdAt: new Date().toISOString()
      });
      alert('Saved successfully! Open Offline Learning Centre → Saved Study Materials to read it without internet on this device.');
    } catch (error) {
      console.error('Could not save study material offline:', error);
      alert(`Could not save offline: ${error instanceof Error ? error.message : 'Browser storage is unavailable. Please allow site storage and try again.'}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#492873] via-[#6842A6] to-[#7E57C2] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#7E57C2]/15 border border-[#B57EDC]/30 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#B57EDC]/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B57EDC]/30 text-[#E6E6FA] border border-[#B57EDC]/40 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            PATHSHALA AI • Study Studio (ଅଧ୍ୟୟନ ସୃଷ୍ଟି କେନ୍ଦ୍ର)
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Study Material Generator
          </h1>
          <p className="text-purple-100 text-xs sm:text-sm">
            Generate tailored revision sheets, interactive flashcards, formula cheat sheets, and summaries at your exact grade level.
          </p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
            1. Select Material Format
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs font-semibold">
            {[
              { id: 'short_notes', label: 'Short Notes', icon: FileText },
              { id: 'summary', label: 'Summary', icon: BookOpen },
              { id: 'flashcards', label: 'Flashcards', icon: Layers },
              { id: 'formulas', label: 'Formula Sheet', icon: Cpu },
              { id: 'mindmap', label: 'Mind Map', icon: Share2 },
              { id: 'vocab', label: 'Vocabulary', icon: HelpCircle },
            ].map((fmt) => {
              const Icon = fmt.icon;
              const isSelected = contentType === fmt.id;
              return (
                <button
                  key={fmt.id}
                  onClick={() => setContentType(fmt.id as StudioContentType)}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{fmt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {contentType === 'mindmap' && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-violet-950">
              <Network className="h-5 w-5" />
              <div>
                <h3 className="text-sm font-extrabold">Build your own mind map</h3>
                <p className="text-xs text-violet-800/70">Enter one idea per line, or separate ideas with commas. The preview updates as you type.</p>
              </div>
            </div>
            <textarea value={mindMapEntries} onChange={(e) => setMindMapEntries(e.target.value)} rows={4} placeholder="Main idea&#10;Definition&#10;Key points&#10;Examples&#10;Formulas" className="w-full resize-y rounded-xl border border-violet-200 bg-white p-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-400/40" />
            <div className="rounded-2xl border border-violet-100 bg-white p-4">
              <div className="mx-auto mb-4 max-w-xs rounded-xl bg-violet-700 px-4 py-3 text-center text-sm font-bold text-white shadow-sm">{topic || 'Your main topic'}</div>
              <div className="mx-auto mb-3 h-5 w-px bg-violet-300" />
              {mindMapBranches.length ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {mindMapBranches.map((entry, index) => (
                    <div key={entry + index} className="relative rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 text-center text-xs font-semibold text-violet-950">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-violet-500">Branch {index + 1}</span>
                      {entry}
                    </div>
                  ))}
                </div>
              ) : <p className="text-center text-xs text-slate-500">Add some ideas above to build your mind map.</p>}
            </div>
            <p className="text-[11px] text-violet-800/75">Select “Generate Study Material” to ask AI to organize these entries into a detailed mind map for Class {profile.classNum}, {activeSubject}.</p>
          </div>
        )}

        {/* Topic & Language inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">
              Chapter or Specific Concept:
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Chemical Reactions and Equations"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">
              Output Language:
            </label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
            >
              <option value="Odia">Odia (ଓଡ଼ିଆ)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
              <option value="English">English</option>
              <option value="Urdu">Urdu (اردو)</option>
              <option value="Telugu">Telugu (తెలుగు)</option>
              <option value="Bengali">Bengali (বাংলা)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!topic || isGenerating}
          className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition"
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Generating {contentType.replace('_', ' ')} in {targetLang}...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Study Material</span>
            </>
          )}
        </button>
      </div>

      {/* Interactive Flashcard View */}
      {contentType === 'flashcards' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Interactive Concept Flashcards (Click to flip)
            </h3>
            <span className="text-xs text-slate-400">Class {profile.classNum} • {activeSubject}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sampleFlashcards.map((card, idx) => {
              const isFlipped = flashcardFlipped === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setFlashcardFlipped(isFlipped ? null : idx)}
                  className={`p-5 rounded-2xl border cursor-pointer min-h-[130px] flex flex-col justify-between transition-all duration-200 select-none shadow-sm ${
                    isFlipped
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-indigo-50/60 border-indigo-200 text-indigo-950 hover:bg-indigo-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold opacity-70 mb-2">
                    <span>Card #{idx + 1}</span>
                    <span className="flex items-center gap-1">
                      <RotateCw className="w-3 h-3" />
                      {isFlipped ? 'Answer' : 'Question (Click to flip)'}
                    </span>
                  </div>

                  <p className="font-bold text-sm sm:text-base leading-snug">
                    {isFlipped ? card.a : card.q}
                  </p>

                  <div className="text-[10px] text-right font-medium opacity-60 mt-2">
                    {isFlipped ? 'Tap to see question' : 'Tap to see answer'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subject-specific learning videos */}
      <section className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-100 text-sky-700"><Video className="h-5 w-5" /></div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Learn with videos</h2>
            <p className="mt-1 text-xs text-slate-500">Video lessons matched to Class {profile.classNum}, {activeSubject} and your topic: {topic}.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { title: 'Topic explanation', description: 'Understand the concept step by step', url: videoSearchUrl },
            { title: 'Visual learning', description: 'Watch animations and worked examples', url: conceptVideoUrl },
            { title: 'Quick revision', description: 'Review key points before a test', url: revisionVideoUrl },
          ].map((video) => (
            <a key={video.title} href={video.url} target="_blank" rel="noreferrer" className="group rounded-2xl border border-sky-100 bg-white p-4 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
              <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-700"><PlayCircle className="h-10 w-10 transition group-hover:scale-110" /></div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">{video.title}<ExternalLink className="h-3.5 w-3.5 text-slate-400" /></h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">{video.description}</p>
              <span className="mt-3 inline-flex text-xs font-bold text-sky-700">Find videos on YouTube →</span>
            </a>
          ))}
        </div>
        <p className="text-[10px] text-slate-400">YouTube search results open in a new tab. Review video accuracy and suitability before using them for schoolwork.</p>
      </section>

      {/* Generated Content Output Section */}
      {generatedContent && (
        <div className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-lg space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Generated Material: {topic}
                </h3>
                <span className="text-xs text-slate-400">
                  AI-Generated Educational Content • Class {profile.classNum}
                </span>
              </div>
            </div>

            <button
              onClick={handleSaveToOfflineNotes}
              disabled={generatedContent.startsWith('LIVE AI ERROR:')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Bookmark className="w-3.5 h-3.5" />
              Save to Offline Notes
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
            {generatedContent}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-500 border border-slate-200 flex items-center gap-2">
            <span className="font-bold text-slate-700">Notice:</span>
            <span>This content is AI-generated for learning reinforcement. Please cross-verify formulas and dates with your official prescribed textbook.</span>
          </div>
        </div>
      )}
    </div>
  );
};
