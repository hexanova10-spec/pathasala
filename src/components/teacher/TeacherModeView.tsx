import React, { useEffect, useState } from 'react';
import { ALL_CLASSES } from '../../data/curriculum';
import {
  GraduationCap,
  Sparkles,
  FileSpreadsheet,
  Download,
  Users,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Copy,
  Printer,
  Calendar,
  FileText,
  Camera,
  Activity,
  Award,
  Clock,
  ArrowRight,
  TrendingUp,
  Settings,
  ShieldCheck
} from 'lucide-react';

interface TeacherModeViewProps {
  onNavigateToHomework?: () => void;
  onNavigateToReports?: () => void;
  onNavigateToCameraAlerts?: () => void;
  onNavigateToInsights?: () => void;
  onNavigateToActivity?: () => void;
}

export const TeacherModeView: React.FC<TeacherModeViewProps> = ({
  onNavigateToHomework,
  onNavigateToReports,
  onNavigateToCameraAlerts,
  onNavigateToInsights,
  onNavigateToActivity
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'planner' | 'students'>('overview');
  const [liveStudents, setLiveStudents] = useState<any[]>([]);
  const [rosterStatus, setRosterStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    const loadRoster = async () => {
      try {
        const token = localStorage.getItem('pathashala_token');
        const response = await fetch('/api/teacher/students', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load the class roster.');
        if (!cancelled) {
          setLiveStudents(Array.isArray(data.students) ? data.students : []);
          setRosterStatus('ready');
        }
      } catch {
        if (!cancelled) setRosterStatus('error');
      }
    };
    void loadRoster();
    const timer = window.setInterval(() => { void loadRoster(); }, 15000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  // Lesson planner states
  const [selectedClass, setSelectedClass] = useState(10);
  const [subject, setSubject] = useState('Physics');
  const [topic, setTopic] = useState('Electric Circuits and Ohm’s Law');
  const [language, setLanguage] = useState('Odia');
  const [toolAction, setToolAction] = useState<'lesson_plan' | 'worksheet' | 'quiz' | 'multilingual'>('lesson_plan');
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<'checking' | 'live' | 'demo'>('checking');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/ai/status')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('AI status unavailable')))
      .then((data) => { if (!cancelled) setAiMode(data.configured ? 'live' : 'demo'); })
      .catch(() => { if (!cancelled) setAiMode('demo'); });
    return () => { cancelled = true; };
  }, []);

  const sampleClassGaps = [
    { concept: 'Prism Refraction & Dispersion Angle', affectedStudents: '12 of 38 (31%)', recommendation: 'Conduct ray tracer interactive demonstration.' },
    { concept: 'Unit conversion (mA to Amperes in Ohm calculations)', affectedStudents: '16 of 38 (42%)', recommendation: 'Assign a 5-minute warm-up drill on SI unit prefixes.' },
    { concept: 'Series vs Parallel equivalent formulas', affectedStudents: '8 of 38 (21%)', recommendation: 'Review resistor schematic circuit flashcards.' }
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setOutput(null);
    const tasks: Record<string, string> = {
      lesson_plan: `Create a complete 45-minute lesson plan for Class ${selectedClass} ${subject} on “${topic}”. Include learning objectives, materials, timed teaching steps, local real-life examples from Odisha/India, formative assessment, differentiation, and homework.`,
      worksheet: `Create a printable Class ${selectedClass} ${subject} worksheet on “${topic}” for 30 minutes and 20 marks. Include short answers, conceptual questions, numericals/application questions, and a separate answer key.`,
      quiz: `Create a quiz for Class ${selectedClass} ${subject} on “${topic}” with 5 multiple-choice questions, four options each, correct answers, and short explanations.`,
      multilingual: `Create a classroom teaching resource for Class ${selectedClass} ${subject} on “${topic}” in ${language}. Include simple explanation, English technical terms in brackets, local examples, and a short bilingual recap.`
    };
    try {
      const response = await fetch('/api/gemini/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: tasks[toolAction],
          classNum: selectedClass,
          subject,
          board: 'Odisha State Board (BSE) / CBSE',
          targetLanguage: language,
          textbookLanguage: 'English',
          action: toolAction === 'quiz' ? 'generate_quiz' : toolAction
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `AI request failed (HTTP ${response.status})`);
      const notice = data.isDemo ? `\n\n---\n**Demo mode:** ${data.demoNotice || 'Configure GEMINI_API_KEY to enable live Gemini responses.'}` : '';
      setOutput(`${data.answer || 'The AI did not return an answer.'}${notice}`);
    } catch (error) {
      setOutput(error instanceof Error ? `AI request failed: ${error.message}. Confirm the backend is running and GEMINI_API_KEY is configured.` : 'AI request failed. Confirm the backend is running and GEMINI_API_KEY is configured.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#004B38] via-[#006A4E] to-[#0B8457] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#004B38]/15 border border-[#D5E9DC]/30 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#DFF3E8]/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-[#DFF3E8] border border-white/25 text-xs font-semibold backdrop-blur-xs">
            <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
            PATHASHALA AI • Teacher Dashboard & Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Teacher Command Centre
          </h1>
          <p className="text-[#DFF3E8] text-xs sm:text-sm">
            Welcome, <strong>Smt. Priya Sharma</strong> (Science & Math Department). Manage authorized classes, evaluate homework, review camera presence alerts, and release parent reports.
          </p>
        </div>
      </div>

      {/* Live roster synced from student accounts in the shared backend database */}
      <section className="rounded-3xl border border-[#D5E9DC] bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-[#18352A]">Live Student Profiles</h2>
            <p className="text-xs text-[#64776B]">Student name, class, school, subjects and language update from registered student accounts.</p>
          </div>
          <span className="rounded-full bg-[#E8F5EC] px-3 py-1 text-xs font-bold text-[#006A4E]">
            {rosterStatus === 'loading' ? 'Syncing…' : rosterStatus === 'error' ? 'Sync unavailable' : `${liveStudents.length} linked students`}
          </span>
        </div>
        {rosterStatus === 'error' ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Student profiles could not be loaded. Check that you are signed in and the backend is deployed.</p>
        ) : liveStudents.length === 0 && rosterStatus === 'ready' ? (
          <p className="rounded-xl bg-[#F4FBF6] p-3 text-sm text-[#64776B]">No registered students match your assigned classes and school yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {liveStudents.map((student) => (
              <article key={student.id} className="rounded-2xl border border-[#E1EEE5] bg-[#FAFDFB] p-4">
                <p className="font-bold text-[#18352A]">{student.name}</p>
                <p className="mt-1 text-xs text-[#64776B]">{student.identifier || student.id} · Class {student.classNum}</p>
                <p className="mt-2 text-xs text-[#18352A]">{student.school || student.profile?.schoolName || 'School not provided'}</p>
                <p className="mt-1 text-xs text-[#64776B]">Subjects: {(student.profile?.subjects || [student.preferredSubject || 'Mathematics']).join(', ')}</p>
                <p className="mt-1 text-xs text-[#64776B]">Language: {student.preferredLanguage || 'Odia'}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Teacher Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
        <button
          onClick={() => setSelectedTab('overview')}
          className={`px-4 py-2 rounded-xl transition ${
            selectedTab === 'overview'
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-white text-[#64776B] border border-[#D5E9DC] hover:bg-[#F4FBF6]'
          }`}
        >
          Teacher Overview
        </button>
        <button
          onClick={() => setSelectedTab('planner')}
          className={`px-4 py-2 rounded-xl transition ${
            selectedTab === 'planner'
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-white text-[#64776B] border border-[#D5E9DC] hover:bg-[#F4FBF6]'
          }`}
        >
          AI Lesson & Worksheet Planner
        </button>
      </div>

      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* 8 Required Teacher Dashboard Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Card 1: Assigned Classes */}
            <div className="bg-white rounded-3xl p-5 border border-[#D5E9DC] shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-2xl bg-[#DFF3E8] text-[#006A4E] flex items-center justify-center font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-[#64776B] block">Assigned Classes</span>
              <strong className="text-xl font-black text-[#18352A]">Classes 9 & 10</strong>
              <span className="text-[10px] text-[#006A4E] block">BSE & CBSE Sections</span>
            </div>

            {/* Card 2: Assigned Students */}
            <div className="bg-white rounded-3xl p-5 border border-[#D5E9DC] shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-2xl bg-[#DFF3E8] text-[#006A4E] flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-[#64776B] block">Assigned Students</span>
              <strong className="text-xl font-black text-[#18352A]">80 Students</strong>
              <span className="text-[10px] text-[#64776B] block">38 in Class 10A, 42 in 9B</span>
            </div>

            {/* Card 3: Homework Awaiting Review */}
            <div
              onClick={onNavigateToHomework}
              className="bg-white rounded-3xl p-5 border border-[#D5E9DC] hover:border-[#006A4E] transition cursor-pointer shadow-xs space-y-2"
            >
              <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-[#64776B] block">Homework to Review</span>
              <strong className="text-xl font-black text-amber-700">7 Submissions</strong>
              <span className="text-[10px] text-[#006A4E] font-bold block">Open Grading →</span>
            </div>

            {/* Card 4: Reports to Prepare */}
            <div
              onClick={onNavigateToReports}
              className="bg-white rounded-3xl p-5 border border-[#D5E9DC] hover:border-[#006A4E] transition cursor-pointer shadow-xs space-y-2"
            >
              <div className="w-9 h-9 rounded-2xl bg-[#DFF3E8] text-[#006A4E] flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-[#64776B] block">Reports to Prepare</span>
              <strong className="text-xl font-black text-[#006A4E]">2 Drafts</strong>
              <span className="text-[10px] text-[#006A4E] font-bold block">12-Section Builder →</span>
            </div>

            {/* Card 5: Upcoming Sessions */}
            <div className="bg-white rounded-3xl p-5 border border-[#D5E9DC] shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-[#64776B] block">Upcoming Sessions</span>
              <strong className="text-base font-black text-[#18352A]">Today 11:30 AM</strong>
              <span className="text-[10px] text-[#64776B] block">Class 10 Physics Focus</span>
            </div>

            {/* Card 6: Students Needing Academic Support */}
            <div
              onClick={onNavigateToInsights}
              className="bg-white rounded-3xl p-5 border border-[#D5E9DC] hover:border-amber-400 transition cursor-pointer shadow-xs space-y-2"
            >
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-[#64776B] block">Needing Support</span>
              <strong className="text-xl font-black text-amber-700">5 Students</strong>
              <span className="text-[10px] text-[#006A4E] font-bold block">AI Insights →</span>
            </div>

            {/* Card 7: Recent Learning Activity */}
            <div
              onClick={onNavigateToActivity}
              className="bg-white rounded-3xl p-5 border border-[#D5E9DC] hover:border-[#006A4E] transition cursor-pointer shadow-xs space-y-2"
            >
              <div className="w-9 h-9 rounded-2xl bg-[#DFF3E8] text-[#006A4E] flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-[#64776B] block">Recent Activity</span>
              <strong className="text-xl font-black text-[#18352A]">142 Events</strong>
              <span className="text-[10px] text-[#006A4E] font-bold block">View Timeline →</span>
            </div>

            {/* Card 8: Camera Events Awaiting Review */}
            <div
              onClick={onNavigateToCameraAlerts}
              className="bg-white rounded-3xl p-5 border border-[#D5E9DC] hover:border-amber-400 transition cursor-pointer shadow-xs space-y-2"
            >
              <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-[#64776B] block">Camera Alerts</span>
              <strong className="text-xl font-black text-rose-700">1 Provisional</strong>
              <span className="text-[10px] text-[#006A4E] font-bold block">Review Queue →</span>
            </div>
          </div>

          {/* Aggregated Class Gaps Section */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D5E9DC] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-[#18352A] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Aggregated Class Learning Gaps (Class 10 Science)
                </h3>
                <p className="text-xs text-[#64776B]">
                  Identified automatically by PATHASHALA AI through student mistake patterns in practice quizzes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {sampleClassGaps.map((gap, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC] space-y-2 text-xs"
                >
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    {gap.affectedStudents}
                  </span>
                  <h4 className="font-bold text-[#18352A]">{gap.concept}</h4>
                  <p className="text-[#64776B] text-[11px] leading-relaxed">
                    <strong>Intervention:</strong> {gap.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'planner' && (
        <div className="space-y-4">
          <div className={`flex items-start gap-3 rounded-2xl border p-4 text-xs ${aiMode === 'live' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <strong>{aiMode === 'checking' ? 'Checking AI connection…' : aiMode === 'live' ? 'Gemini AI is configured' : 'Demo mode — live Gemini is not configured'}</strong>
              <p className="mt-1">{aiMode === 'live' ? 'Lesson plans, worksheets, quizzes and multilingual resources will request live AI. Provider quota or network errors may still occur.' : 'Add a valid GEMINI_API_KEY to the backend hosting environment, then restart/redeploy the backend. The key must never be placed in frontend variables.'}</p>
            </div>
          </div>
        <div className="space-y-6">
          {/* Generator Controls */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D5E9DC] shadow-sm space-y-5">
            <h3 className="font-extrabold text-sm text-[#18352A]">
              Configure Curriculum Content & Medium
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#18352A] mb-1">Grade / Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[#D5E9DC] font-bold bg-white"
                >
                  {ALL_CLASSES.map((c) => (
                    <option key={c.num} value={c.num}>
                      {c.label} ({c.stage})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#18352A] mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D5E9DC] font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#18352A] mb-1">Medium Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D5E9DC] font-bold bg-white"
                >
                  {['Odia', 'Hindi', 'Urdu', 'Telugu', 'Bengali', 'English'].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#18352A] text-xs mb-1">
                Chapter / Topic Name
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#D5E9DC] text-xs font-semibold"
              />
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-bold pt-2">
              <button
                onClick={() => setToolAction('lesson_plan')}
                className={`px-4 py-2 rounded-xl transition ${
                  toolAction === 'lesson_plan'
                    ? 'bg-[#006A4E] text-white'
                    : 'bg-[#F4FBF6] text-[#64776B] hover:bg-[#DFF3E8]'
                }`}
              >
                5E Lesson Plan
              </button>
              <button
                onClick={() => setToolAction('worksheet')}
                className={`px-4 py-2 rounded-xl transition ${
                  toolAction === 'worksheet'
                    ? 'bg-[#006A4E] text-white'
                    : 'bg-[#F4FBF6] text-[#64776B] hover:bg-[#DFF3E8]'
                }`}
              >
                Board Worksheet
              </button>
              <button
                onClick={() => setToolAction('quiz')}
                className={`px-4 py-2 rounded-xl transition ${
                  toolAction === 'quiz'
                    ? 'bg-[#006A4E] text-white'
                    : 'bg-[#F4FBF6] text-[#64776B] hover:bg-[#DFF3E8]'
                }`}
              >
                Quick Quiz
              </button>
              <button
                onClick={() => setToolAction('multilingual')}
                className={`px-4 py-2 rounded-xl transition ${
                  toolAction === 'multilingual'
                    ? 'bg-[#006A4E] text-white'
                    : 'bg-[#F4FBF6] text-[#64776B] hover:bg-[#DFF3E8]'
                }`}
              >
                Bilingual Bridge Resource
              </button>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 rounded-2xl bg-[#006A4E] hover:bg-[#004B38] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? 'Generating Pedagogical Resource...' : 'Generate Resource'}</span>
            </button>
          </div>

          {/* Generated Result */}
          {output && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D5E9DC] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#D5E9DC]">
                <span className="text-xs font-bold text-[#006A4E]">
                  Generated Teaching Artifact
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(output)}
                    className="p-1.5 rounded-lg border border-[#D5E9DC] text-xs font-bold flex items-center gap-1 hover:bg-[#F4FBF6]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="p-1.5 rounded-lg border border-[#D5E9DC] text-xs font-bold flex items-center gap-1 hover:bg-[#F4FBF6]"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              <div className="text-xs text-[#18352A] whitespace-pre-line leading-relaxed font-sans">
                {output}
              </div>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
};
