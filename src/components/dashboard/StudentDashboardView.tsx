import React from 'react';
import { StudentProfile, SubjectItem } from '../../types';
import { getSubjectsForClass } from '../../data/curriculum';
import {
  Sparkles,
  BookOpen,
  Trophy,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  Wifi,
  WifiOff,
  AlertTriangle,
  PlayCircle,
  HelpCircle,
  Layers,
  Award,
  Zap,
  Bookmark,
  FileText,
  Calendar,
  Camera,
  CheckSquare,
  TrendingUp,
  GraduationCap
} from 'lucide-react';

const GREETINGS_BY_LANGUAGE: Record<string, string> = {
  odia: 'ନମସ୍କାର',
  hindi: 'नमस्ते',
  english: 'Hello',
  urdu: 'السلام علیکم',
  telugu: 'నమస్కారం',
  marathi: 'नमस्कार',
  kannada: 'ನಮಸ್ಕಾರ',
  tamil: 'வணக்கம்',
  bengali: 'নমস্কার',
  gujarati: 'નમસ્તે',
  punjabi: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
  malayalam: 'നമസ്കാരം',
  assamese: 'নমস্কাৰ',
  sanskrit: 'नमस्ते',
  kashmiri: 'آداب',
  konkani: 'नमस्कार',
  nepali: 'नमस्कार',
  sindhi: 'سلام',
  manipuri: 'খুরুমজরি',
  bodo: 'नमस्कार',
  dogri: 'नमस्कार',
  santali: 'ᱡᱚᱦᱟᱨ',
  maithili: 'प्रणाम'
};

function getGreeting(language: string | undefined): string {
  if (!language) return GREETINGS_BY_LANGUAGE.english;
  const normalized = language.trim().toLowerCase();
  return GREETINGS_BY_LANGUAGE[normalized] || GREETINGS_BY_LANGUAGE[normalized.split(/[ /-]/)[0]] || GREETINGS_BY_LANGUAGE.english;
}

interface StudentDashboardViewProps {
  profile: StudentProfile;
  activeSubject: string;
  xpPoints: number;
  streakDays: number;
  isSimulatedOffline: boolean;
  onSelectSubject: (subjectName: string) => void;
  onNavigateToTutor: () => void;
  onNavigateToPractice: () => void;
  onNavigateToPath: () => void;
  onNavigateToStudio: () => void;
  onNavigateToOffline: () => void;
  onNavigateToHomework?: () => void;
  onNavigateToFocus?: () => void;
  onNavigateToProgress?: () => void;
  onNavigateToReports?: () => void;
  onOpenClassSelector: () => void;
  onOpenLanguageCenter: () => void;
  onSwitchAssignedClass?: (classNum: number) => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  profile,
  activeSubject,
  xpPoints,
  streakDays,
  isSimulatedOffline,
  onSelectSubject,
  onNavigateToTutor,
  onNavigateToPractice,
  onNavigateToPath,
  onNavigateToStudio,
  onNavigateToOffline,
  onNavigateToHomework,
  onNavigateToFocus,
  onNavigateToProgress,
  onNavigateToReports,
  onOpenClassSelector,
  onOpenLanguageCenter,
  onSwitchAssignedClass
}) => {
  const subjects = getSubjectsForClass(profile.classNum);

  const badges = [
    { id: '1', name: 'First Doubt', desc: 'Asked AI tutor your first doubt', icon: '🌟', unlocked: true },
    { id: '2', name: 'Regional Scholar', desc: 'Typed using regional keyboard', icon: '🇮🇳', unlocked: true },
    { id: '3', name: 'Science Explorer', desc: 'Completed Physics quizzes', icon: '🔬', unlocked: true },
    { id: '4', name: 'Offline Champion', desc: 'Studied without internet', icon: '⚡', unlocked: true },
    { id: '5', name: 'Streak Master', desc: 'Maintained 5-day streak', icon: '🔥', unlocked: true },
    { id: '6', name: 'Focus Champ', desc: '30-minute focused session', icon: '⏱️', unlocked: true }
  ];

  const todayGoals = [
    { id: 'g1', title: `Complete Ohm's Law circuit derivation in ${activeSubject}`, completed: true },
    { id: 'g2', title: 'Solve 5 adaptive practice questions in Practice Zone', completed: true },
    { id: 'g3', title: `Review key formulas in ${profile.tutorLanguage}`, completed: false }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Hero Welcome Card in Bottle Green */}
      <div className="bg-gradient-to-r from-[#004B38] via-[#006A4E] to-[#0B8457] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#004B38]/15 border border-[#D5E9DC]/30 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#DFF3E8]/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/20 text-[#DFF3E8] border border-white/25 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                PATHASHALA AI • Student Portal
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-xs font-medium text-emerald-100">
                Verified Enrolment
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              {getGreeting(profile.tutorLanguage)}, {profile.nickname || profile.name}!
            </h1>
            <p className="text-[#DFF3E8] text-xs sm:text-sm leading-relaxed">
              Welcome to <strong>PATHASHALA AI</strong>. Personalized educational agent ready for <strong>Class {profile.classNum} ({profile.schoolBoard})</strong> with multilingual guidance in <strong>{profile.tutorLanguage}</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onNavigateToTutor}
                className="px-5 py-2.5 rounded-2xl bg-white hover:bg-[#F4FBF6] text-[#004B38] font-bold text-xs sm:text-sm transition shadow-lg shadow-black/10 flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4 text-[#006A4E]" />
                <span>Resume Learning in {activeSubject.split(' ')[0]}</span>
              </button>

              {onNavigateToFocus && (
                <button
                  onClick={onNavigateToFocus}
                  className="px-5 py-2.5 rounded-2xl bg-[#003627]/60 hover:bg-[#003627] text-white border border-white/20 font-bold text-xs sm:text-sm transition flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-[#A5D9C2]" />
                  <span>Start Focus Session</span>
                </button>
              )}
            </div>
          </div>

          {/* Gamification & Streak Widget */}
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center space-y-1">
              <div className="flex items-center justify-center gap-1 text-amber-300 font-bold text-xs">
                <Flame className="w-4 h-4 fill-current" />
                <span>Daily Streak</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">{streakDays} Days</div>
              <span className="text-[10px] text-emerald-200">Consistency Goal Met</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center space-y-1">
              <div className="flex items-center justify-center gap-1 text-amber-300 font-bold text-xs">
                <Trophy className="w-4 h-4" />
                <span>XP Mastery</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">{xpPoints} XP</div>
              <span className="text-[10px] text-emerald-200">Level 4 Scholar</span>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 1: My Classes (Strict 2-Class limit selector) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D5E9DC] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#006A4E]" />
            <h2 className="font-extrabold text-sm sm:text-base text-[#18352A]">
              My Assigned Classes (Strict 2-Class Limit)
            </h2>
          </div>
          <button
            onClick={onOpenClassSelector}
            className="text-xs font-bold text-[#006A4E] hover:underline"
          >
            Class Settings
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(profile.assignedClasses || [10, 9]).map((cls) => {
            const isActive = profile.classNum === cls;
            return (
              <div
                key={cls}
                onClick={() => onSwitchAssignedClass && onSwitchAssignedClass(cls)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isActive
                    ? 'bg-[#DFF3E8] border-[#006A4E] ring-2 ring-[#006A4E]/20 shadow-xs'
                    : 'bg-[#F4FBF6] border-[#D5E9DC] hover:border-[#006A4E]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-[#18352A]">Class {cls}</span>
                    {isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#006A4E] text-white">
                        Active Workspace
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#64776B]">
                    {cls === 10 ? 'Secondary Matriculation Board Prep' : 'Foundational Secondary Revision'}
                  </span>
                </div>

                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs ${
                    isActive
                      ? 'bg-[#006A4E] text-white'
                      : 'bg-white text-[#18352A] border border-[#D5E9DC]'
                  }`}
                >
                  {isActive ? 'Current' : 'Switch'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid Row 2: Today's Goals, Upcoming Homework, Start Study Session */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARD: Today's Learning Goals */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D5E9DC] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#64776B] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#006A4E]" />
              Today's Learning Goals
            </h3>
            <span className="text-[11px] font-extrabold text-[#006A4E]">2 of 3 Done</span>
          </div>

          <div className="space-y-2.5">
            {todayGoals.map((goal) => (
              <div
                key={goal.id}
                className="p-3 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC] flex items-start gap-2.5 text-xs text-[#18352A]"
              >
                <div
                  className={`w-4 h-4 rounded-md mt-0.5 shrink-0 flex items-center justify-center border ${
                    goal.completed
                      ? 'bg-[#006A4E] border-[#004B38] text-white'
                      : 'bg-white border-[#D5E9DC]'
                  }`}
                >
                  {goal.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <span className={goal.completed ? 'line-through text-[#64776B]' : 'font-semibold'}>
                  {goal.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CARD: Upcoming Homework */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D5E9DC] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#64776B] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#006A4E]" />
              Upcoming Homework
            </h3>
            {onNavigateToHomework && (
              <button
                onClick={onNavigateToHomework}
                className="text-[11px] font-bold text-[#006A4E] hover:underline"
              >
                View All
              </button>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DFF3E8] text-[#006A4E]">
                Physics • Due Oct 16
              </span>
              <span className="text-amber-700 font-bold text-[10px]">Pending</span>
            </div>
            <h4 className="font-bold text-[#18352A]">
              Ohm's Law Circuit Diagram & V-I Graph Numerical
            </h4>
            <p className="text-[11px] text-[#64776B]">
              Draw schematic diagram and solve 6V battery numerical.
            </p>
            {onNavigateToHomework && (
              <button
                onClick={onNavigateToHomework}
                className="w-full py-2 rounded-xl bg-white border border-[#D5E9DC] hover:border-[#006A4E] font-bold text-[#006A4E] text-xs transition"
              >
                Submit Solution
              </button>
            )}
          </div>
        </div>

        {/* CARD: Start Study Session (Focus Mode) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D5E9DC] shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#64776B] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#006A4E]" />
                Start Study Session
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DFF3E8] text-[#006A4E]">
                30 Mins Target
              </span>
            </div>

            <p className="text-xs text-[#18352A] leading-relaxed">
              Structured distraction-free session with tab-interruption detection and 3-minute break scheduling.
            </p>
          </div>

          {onNavigateToFocus && (
            <button
              onClick={onNavigateToFocus}
              className="w-full py-3 rounded-2xl bg-[#006A4E] hover:bg-[#004B38] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              <span>Launch Focus Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Row 3: My Progress & Subject Mastery quick cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD: My Progress Snapshot */}
        <div className="bg-white rounded-3xl p-6 border border-[#D5E9DC] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-[#18352A] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#006A4E]" />
              My Progress & Mastery Overview
            </h3>
            {onNavigateToProgress && (
              <button
                onClick={onNavigateToProgress}
                className="text-xs font-bold text-[#006A4E] hover:underline"
              >
                Full Analytics Board
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-3 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC]">
              <span className="text-[10px] text-[#64776B] font-bold block">Overall Mastery</span>
              <strong className="text-base font-black text-[#006A4E]">89.5%</strong>
            </div>
            <div className="p-3 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC]">
              <span className="text-[10px] text-[#64776B] font-bold block">Quizzes Taken</span>
              <strong className="text-base font-black text-[#18352A]">42 Qs</strong>
            </div>
            <div className="p-3 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC]">
              <span className="text-[10px] text-[#64776B] font-bold block">Improvement</span>
              <strong className="text-base font-black text-emerald-700">+12%</strong>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#DFF3E8] border border-[#D5E9DC] text-xs flex items-center justify-between">
            <span className="text-[#004B38] font-bold">
              AI Recommendation: Revise Prism Refraction before exams.
            </span>
            <button
              onClick={onNavigateToPractice}
              className="px-3 py-1 rounded-xl bg-[#006A4E] text-white font-bold text-[11px] hover:bg-[#004B38] shrink-0"
            >
              Practice
            </button>
          </div>
        </div>

        {/* CARD: Recent Reports & Saved Offline Lessons */}
        <div className="bg-white rounded-3xl p-6 border border-[#D5E9DC] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-[#18352A] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#006A4E]" />
              Reports & Offline Cache
            </h3>
            {onNavigateToReports && (
              <button
                onClick={onNavigateToReports}
                className="text-xs font-bold text-[#006A4E] hover:underline"
              >
                View Reports
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div
              onClick={onNavigateToReports}
              className="p-3.5 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC] hover:border-[#006A4E] transition cursor-pointer space-y-1.5"
            >
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Latest Report: Oct 13
              </span>
              <h4 className="font-bold text-[#18352A]">Bi-Weekly Evaluation</h4>
              <p className="text-[11px] text-[#64776B]">
                Grade A+ by Smt. Priya Sharma. Released feedback available.
              </p>
            </div>

            <div
              onClick={onNavigateToOffline}
              className="p-3.5 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC] hover:border-[#006A4E] transition cursor-pointer space-y-1.5"
            >
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DFF3E8] text-[#006A4E]">
                IndexedDB Cache
              </span>
              <h4 className="font-bold text-[#18352A]">Saved Offline Lessons</h4>
              <p className="text-[11px] text-[#64776B]">
                3 lessons and 15 flashcards saved for offline village study.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#18352A] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#006A4E]" />
            Your Subjects (Class {profile.classNum})
          </h2>
          <span className="text-xs text-[#64776B] font-bold">
            {subjects.length} Subjects Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((sub) => {
            const isCurrent = activeSubject.toLowerCase().includes(sub.name.toLowerCase().split(' ')[0]);

            return (
              <div
                key={sub.id}
                onClick={() => onSelectSubject(sub.name)}
                className={`bg-white rounded-3xl p-5 border transition-all cursor-pointer space-y-3 ${
                  isCurrent
                    ? 'border-[#006A4E] ring-2 ring-[#006A4E]/20 shadow-md'
                    : 'border-[#D5E9DC] hover:border-[#006A4E]/50 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-[#DFF3E8] text-[#006A4E] flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#006A4E] text-white">
                      Active
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-extrabold text-sm text-[#18352A]">{sub.name}</h3>
                  <p className="text-xs text-[#64776B] line-clamp-2 mt-1 leading-relaxed">
                    {sub.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#D5E9DC] text-xs">
                  <span className="text-[11px] font-semibold text-[#64776B]">
                    {sub.topicsCount} Chapters
                  </span>
                  <span className="text-[#006A4E] font-bold flex items-center gap-1 group">
                    <span>Study Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
