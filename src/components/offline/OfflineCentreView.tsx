import React, { useState, useEffect } from 'react';
import { OfflineLesson, StudentProfile } from '../../types';
import { offlineStorage, OfflineAction } from '../../services/offlineStorage';
import {
  Wifi,
  WifiOff,
  Database,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Clock,
  Video,
  Download,
  PlayCircle
} from 'lucide-react';

interface ClassRecording { id: string; title: string; classNum: number; subject: string; videoUrl: string; teacherName?: string; createdAt?: string; }

const RECORDING_CACHE = 'pathashala-class-recordings-v1';
const RECORDINGS_KEY = 'pathashala_recordings_metadata';

interface OfflineCentreViewProps {
  profile: StudentProfile;
  isSimulatedOffline: boolean;
  onToggleSimulateOffline: () => void;
}

export const OfflineCentreView: React.FC<OfflineCentreViewProps> = ({
  profile,
  isSimulatedOffline,
  onToggleSimulateOffline
}) => {
  const [lessons, setLessons] = useState<OfflineLesson[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [pendingQueue, setPendingQueue] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [activeLesson, setActiveLesson] = useState<OfflineLesson | null>(null);
  const [activeNote, setActiveNote] = useState<any | null>(null);
  const [recordings, setRecordings] = useState<ClassRecording[]>([]);
  const [cachedRecordingIds, setCachedRecordingIds] = useState<string[]>([]);
  const [activeRecording, setActiveRecording] = useState<{ id: string; title: string; src: string } | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<string | null>(null);
  const [recordingBusyId, setRecordingBusyId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const l = await offlineStorage.getLessons();
      const n = await offlineStorage.getNotes();
      const q = await offlineStorage.getQueue();
      setLessons(l);
      setNotes(n);
      setPendingQueue(q);
    } catch (e) {
      console.warn('Load offline data err:', e);
    }
  };

  useEffect(() => {
    void loadData();
    let cancelled = false;
    const loadRecordings = async () => {
      try {
        const saved = localStorage.getItem(RECORDINGS_KEY);
        const localRecords: ClassRecording[] = saved ? JSON.parse(saved) : [];
        if (!cancelled) setRecordings(localRecords);
        if (!navigator.onLine) return;
        const token = localStorage.getItem('pathashala_token');
        if (!token) return;
        const response = await fetch('/api/recordings', { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error(`Recording API returned HTTP ${response.status}`);
        const data = await response.json();
        const serverRecords: ClassRecording[] = Array.isArray(data.recordings) ? data.recordings : [];
        const merged = [...serverRecords, ...localRecords.filter((local) => !serverRecords.some((server) => server.id === local.id))];
        localStorage.setItem(RECORDINGS_KEY, JSON.stringify(merged));
        if (!cancelled) {
          setRecordings(merged);
          const cache = await caches.open(RECORDING_CACHE);
          const cachedIds: string[] = [];
          for (const item of merged) if (await cache.match(item.videoUrl)) cachedIds.push(item.id);
          setCachedRecordingIds(cachedIds);
        }
      } catch (error) {
        console.warn('Class recordings are using locally saved metadata:', error);
      }
    };
    void loadRecordings();
    return () => { cancelled = true; };
  }, []);

  const handleCacheRecording = async (recording: ClassRecording) => {
    setRecordingBusyId(recording.id);
    setRecordingStatus(null);
    try {
      const response = await fetch(recording.videoUrl);
      if (!response.ok || response.type === 'opaque') throw new Error('The video host blocked downloading this video. Use a direct MP4/WebM URL that permits browser access.');
      const cache = await caches.open(RECORDING_CACHE);
      await cache.put(recording.videoUrl, response.clone());
      setCachedRecordingIds((prev) => prev.includes(recording.id) ? prev : [...prev, recording.id]);
      setRecordingStatus(`Saved “${recording.title}” for offline playback on this device.`);
    } catch (error) {
      setRecordingStatus(error instanceof Error ? error.message : 'Could not cache this video. Check the video URL and connection.');
    } finally {
      setRecordingBusyId(null);
    }
  };

  const handlePlayRecording = async (recording: ClassRecording) => {
    try {
      const cached = await caches.match(recording.videoUrl);
      if (cached) {
        const blob = await cached.blob();
        setActiveRecording({ id: recording.id, title: recording.title, src: URL.createObjectURL(blob) });
      } else if (navigator.onLine && !isSimulatedOffline) {
        setActiveRecording({ id: recording.id, title: recording.title, src: recording.videoUrl });
      } else {
        setRecordingStatus('This recording is not saved on this device yet. Connect to the internet and choose Save for Offline first.');
      }
    } catch {
      setRecordingStatus('Could not open this recording. Save it for offline playback while connected.');
    }
  };


  const handleSyncNow = async () => {
    setIsSyncing(true);
    await new Promise((r) => setTimeout(r, 800));
    try {
      await offlineStorage.clearQueue();
      setPendingQueue([]);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteLesson = async (id: string) => {
    await offlineStorage.deleteLesson(id);
    await loadData();
    if (activeLesson?.id === id) setActiveLesson(null);
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await offlineStorage.deleteNote(id);
      await loadData();
      if (activeNote?.id === id) setActiveNote(null);
    } catch (error) {
      console.error('Could not delete saved study material:', error);
      alert('Could not delete this saved material. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                isSimulatedOffline
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}
            >
              {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
              Status: {isSimulatedOffline ? 'Offline Mode (Active)' : 'Online (Connected)'}
            </span>
            <span className="text-xs text-slate-400">IndexedDB Storage</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            Offline Learning Centre (ଅଫଲାଇନ୍ ଶିକ୍ଷଣ)
          </h1>
          <p className="text-xs text-slate-500">
            Learn uninterrupted even in rural villages or during low internet connectivity.
          </p>
        </div>

        {/* Offline simulator toggle button for testing */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSimulateOffline}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-sm ${
              isSimulatedOffline
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            {isSimulatedOffline ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>Switch to Online Mode</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Test Offline Mode</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sync Status Bar */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">
              Local Storage: {lessons.length} Lessons • {notes.length} Notes Cached
            </div>
            <div className="text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last Synchronized: {lastSyncTime}</span>
              <span>•</span>
              <span className="font-semibold text-indigo-700">
                {pendingQueue.length} Pending updates in queue
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSyncNow}
          disabled={isSyncing || isSimulatedOffline || pendingQueue.length === 0}
          className="px-4 py-2 rounded-xl bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs disabled:opacity-40 transition flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Pending Data'}</span>
        </button>
      </div>

      {/* What Works Offline vs Online explanation card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
          <div className="font-bold text-emerald-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Always Available Offline:
          </div>
          <ul className="list-disc list-inside text-emerald-800 space-y-1">
            <li>Read downloaded lessons and summaries in Odia / English.</li>
            <li>Take adaptive practice quizzes (saved in IndexedDB).</li>
            <li>Review saved study notes and flashcards.</li>
            <li>Use the On-Screen Regional Language Keyboard.</li>
          </ul>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-slate-500" />
            Requires Internet Connectivity:
          </div>
          <ul className="list-disc list-inside text-slate-600 space-y-1">
            <li>Live multimodal photo analysis (Gemini Vision API).</li>
            <li>Generating brand new custom AI chapter notes.</li>
            <li>Cloud synchronisation across other devices.</li>
          </ul>
        </div>
      </div>

      {/* Shared class recordings with device-side offline video cache */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2"><Video className="w-5 h-5 text-indigo-600" /><div><h3 className="font-bold text-slate-900 text-sm">Class Recording Videos</h3><p className="text-xs text-slate-500">Recordings published by your teacher. Save a video while online to watch it without internet on this device.</p></div></div>
        {recordingStatus && <p role="status" className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-800">{recordingStatus}</p>}
        {recordings.filter((recording) => profile.assignedClasses.includes(recording.classNum)).length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No recordings published for your assigned classes yet.</p> : <div className="space-y-3">{recordings.filter((recording) => profile.assignedClasses.includes(recording.classNum)).map((recording) => <div key={recording.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4"><div><p className="font-bold text-sm text-slate-900">{recording.title}</p><p className="mt-1 text-xs text-slate-500">Class {recording.classNum} • {recording.subject}{recording.teacherName ? ` • ${recording.teacherName}` : ''}</p><p className="mt-1 text-[11px] text-emerald-700">{cachedRecordingIds.includes(recording.id) ? 'Saved for offline playback' : 'Not saved offline yet'}</p></div><div className="flex gap-2"><button type="button" onClick={() => void handlePlayRecording(recording)} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white flex items-center gap-1"><PlayCircle className="w-4 h-4" /> Play</button><button type="button" disabled={recordingBusyId === recording.id || cachedRecordingIds.includes(recording.id)} onClick={() => void handleCacheRecording(recording)} className="rounded-xl border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 disabled:opacity-50 flex items-center gap-1"><Download className="w-4 h-4" />{recordingBusyId === recording.id ? 'Saving…' : cachedRecordingIds.includes(recording.id) ? 'Saved' : 'Save offline'}</button></div></div>)}</div>}
        {activeRecording && <div className="rounded-2xl border border-indigo-200 bg-slate-950 p-3 space-y-2"><div className="flex justify-between items-center text-white text-xs"><span className="font-bold">{activeRecording.title}</span><button type="button" onClick={() => { if (activeRecording.src.startsWith('blob:')) URL.revokeObjectURL(activeRecording.src); setActiveRecording(null); }} className="rounded-lg bg-white/15 px-2 py-1">Close video</button></div><video key={activeRecording.src} controls playsInline preload="metadata" className="w-full max-h-[420px] rounded-xl" src={activeRecording.src}>Your browser cannot play this video format.</video></div>}
      </div>

      {/* Saved AI study materials */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-indigo-600" />Saved Study Materials (Available Offline)</h3>
          <button type="button" onClick={() => void loadData()} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Refresh</button>
        </div>
        {notes.length === 0 ? <p className="rounded-2xl bg-slate-50 border border-dashed border-slate-300 p-5 text-sm text-slate-500">No saved AI materials yet. While online, generate notes in Study Studio and select “Save to Offline Notes”. They will appear here.</p> : (
          <div className="space-y-3">
            {notes.slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).map((note) => (
              <div key={note.id} className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0"><p className="font-bold text-sm text-slate-900 break-words">{note.title || note.topic || 'Saved study material'}</p><p className="mt-1 text-xs text-slate-500">Class {note.classNum} • {note.subject} • {note.createdAt ? new Date(note.createdAt).toLocaleString() : 'Saved locally'}</p><p className="mt-2 text-xs text-slate-600 line-clamp-2 whitespace-pre-wrap">{note.content}</p></div>
                <div className="flex shrink-0 gap-2"><button type="button" onClick={() => setActiveNote(note)} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white">Open material</button><button type="button" onClick={() => void handleDeleteNote(note.id)} title="Delete saved material" className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button></div>
              </div>
            ))}
          </div>
        )}
      </div>
      {activeNote && <div className="bg-white rounded-3xl p-6 border border-indigo-200 shadow-xl space-y-4"><div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3"><div><p className="text-xs font-bold text-indigo-600">Saved for offline use • Class {activeNote.classNum} • {activeNote.subject}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{activeNote.title || activeNote.topic}</h2></div><button type="button" onClick={() => setActiveNote(null)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">Close</button></div><div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-800">{activeNote.content}</div></div>}

      {/* Cached Lessons List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          Cached Offline Lessons (Ready to study without internet)
        </h3>

        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{lesson.title}</span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                    {lesson.language}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{lesson.summary}</p>
                <div className="text-[11px] text-slate-400">
                  Class {lesson.classNum} • {lesson.subject} • {lesson.keyPoints.length} Key Points
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveLesson(lesson)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1"
                >
                  <span>Open Lesson</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteLesson(lesson.id)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Delete from offline storage"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Lesson Modal / Viewer */}
      {activeLesson && (
        <div className="bg-white rounded-3xl p-6 border border-indigo-200 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-bold text-indigo-600">
                Class {activeLesson.classNum} • {activeLesson.subject}
              </span>
              <h2 className="text-lg font-bold text-slate-900">{activeLesson.title}</h2>
            </div>
            <button
              onClick={() => setActiveLesson(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1 bg-slate-100 rounded-lg"
            >
              Close
            </button>
          </div>

          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {activeLesson.summary}
          </p>

          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Core Principles & Formulas:
            </span>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {activeLesson.keyPoints.map((pt, i) => (
                <li key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
