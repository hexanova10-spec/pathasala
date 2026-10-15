import React, { useEffect, useState } from 'react';
import { StudentProfile } from '../../types';
import { INITIAL_PARENT_REPORTS } from '../../data/mockStore';
import {
  Heart,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Smile,
  Shield,
  FileText,
  Calendar,
  Award,
  ArrowRight
} from 'lucide-react';

interface ParentModeViewProps {
  profile: StudentProfile;
  onNavigateToReports?: () => void;
  onNavigateToHomework?: () => void;
}

export const ParentModeView: React.FC<ParentModeViewProps> = ({
  profile,
  onNavigateToReports,
  onNavigateToHomework
}) => {
  const latestReport = INITIAL_PARENT_REPORTS[0];
  const [linkedChildren, setLinkedChildren] = useState<any[]>([]);
  const [childSyncStatus, setChildSyncStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    const loadChildren = async () => {
      try {
        const token = localStorage.getItem('pathashala_token');
        const response = await fetch('/api/parent/children', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load linked student profile.');
        if (!cancelled) {
          setLinkedChildren(Array.isArray(data.children) ? data.children : []);
          setChildSyncStatus('ready');
        }
      } catch {
        if (!cancelled) setChildSyncStatus('error');
      }
    };
    void loadChildren();
    const timer = window.setInterval(() => { void loadChildren(); }, 15000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <section className="rounded-3xl border border-[#D5E9DC] bg-white p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-[#18352A]">Live Linked Student Profile</h2>
            <p className="text-xs text-[#64776B]">Synced from the student account: class, school, subjects and language.</p>
          </div>
          <span className="rounded-full bg-[#E8F5EC] px-3 py-1 text-xs font-bold text-[#006A4E]">
            {childSyncStatus === "loading" ? "Syncing…" : childSyncStatus === "error" ? "Sync unavailable" : "Auto-refresh: 15 sec"}
          </span>
        </div>
        {childSyncStatus === "error" ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Could not load linked student data. Check your parent account link and backend connection.</p>
        ) : linkedChildren.length === 0 && childSyncStatus === "ready" ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">No student is linked to this parent account yet. When registering as a parent, enter the student ID in the Student ID field.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {linkedChildren.map((child) => (
              <article key={child.id} className="rounded-2xl border border-[#E1EEE5] bg-[#FAFDFB] p-4">
                <p className="font-bold text-[#18352A]">{child.name}</p>
                <p className="mt-1 text-xs text-[#64776B]">{child.identifier || child.id} · Class {child.classNum}</p>
                <p className="mt-2 text-xs text-[#18352A]">{child.school || child.profile?.schoolName || "School not provided"}</p>
                <p className="mt-1 text-xs text-[#64776B]">Subjects: {(child.profile?.subjects || [child.preferredSubject || "Mathematics"]).join(", ")}</p>
                <p className="mt-1 text-xs text-[#64776B]">Learning language: {child.preferredLanguage || "Odia"}</p>
              </article>
            ))}
          </div>
        )}
      </section>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#004B38] via-[#006A4E] to-[#0B8457] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#004B38]/15 border border-[#D5E9DC]/30 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#DFF3E8]/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-[#DFF3E8] border border-white/25 text-xs font-semibold backdrop-blur-xs">
            <Heart className="w-3.5 h-3.5 text-rose-300" />
            PATHASHALA AI • Parent & Guardian Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Supporting {profile.nickname || profile.name}’s Learning Journey
          </h1>
          <p className="text-[#DFF3E8] text-xs sm:text-sm">
            Gentle, encouraging insights into your child's learning habits, homework progress in <strong>Class {profile.classNum}</strong>, and practical ideas to support them at home.
          </p>
        </div>
      </div>

      {/* Linked Children Card */}
      <div className="bg-white rounded-3xl p-5 border border-[#D5E9DC] shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#DFF3E8] text-[#006A4E] font-black flex items-center justify-center text-sm">
            {profile.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#18352A]">{profile.name}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DFF3E8] text-[#006A4E]">
                Class {profile.classNum} • {profile.schoolBoard.split(' ')[0]}
              </span>
            </div>
            <span className="text-xs text-[#64776B]">
              Enrolled in Class {profile.assignedClasses?.join(' & Class ')} (Verified Enrolment)
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {onNavigateToReports && (
            <button
              onClick={onNavigateToReports}
              className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#004B38] text-white font-bold text-xs shadow-xs transition"
            >
              View Official Reports
            </button>
          )}
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-[#D5E9DC] shadow-sm space-y-1">
          <span className="text-xs font-bold text-[#64776B] uppercase tracking-wider block">
            Weekly Study Time
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[#006A4E]">4 hrs 15 mins</div>
          <span className="text-xs text-emerald-700 font-semibold">Consistent 30-40 min daily focus</span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#D5E9DC] shadow-sm space-y-1">
          <span className="text-xs font-bold text-[#64776B] uppercase tracking-wider block">
            Homework Status
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[#006A4E]">100% Up-to-date</div>
          <span className="text-xs text-emerald-700 font-semibold">3 of 3 tasks submitted on time</span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#D5E9DC] shadow-sm space-y-1">
          <span className="text-xs font-bold text-[#64776B] uppercase tracking-wider block">
            Daily Study Streak
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">5 Days 🔥</div>
          <span className="text-xs text-[#64776B] font-medium">Building healthy curiosity</span>
        </div>
      </div>

      {/* Released Teacher Feedback Card */}
      {latestReport && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D5E9DC] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D5E9DC]">
            <h3 className="font-extrabold text-sm text-[#18352A] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#006A4E]" />
              Latest Released Teacher Feedback ({latestReport.reportingPeriod})
            </h3>
            <span className="text-xs text-[#64776B] font-semibold">
              Teacher: {latestReport.teacherName}
            </span>
          </div>

          <p className="text-xs text-[#18352A] leading-relaxed italic bg-[#F4FBF6] p-4 rounded-2xl border border-[#D5E9DC]">
            "{latestReport.teacherFeedback}"
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
            <div className="p-4 rounded-2xl bg-[#DFF3E8]/60 border border-[#D5E9DC] space-y-1.5">
              <span className="font-bold text-[#004B38] block text-[11px] uppercase tracking-wider">
                Key Positive Highlights:
              </span>
              <ul className="space-y-1 text-[#003627]">
                {latestReport.positiveAchievements.map((ach, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#006A4E] mt-0.5 shrink-0" />
                    <span>{ach}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC] space-y-1.5">
              <span className="font-bold text-amber-800 block text-[11px] uppercase tracking-wider">
                Home Support Suggestions:
              </span>
              <ul className="space-y-1 text-[#18352A]">
                {latestReport.recommendedRevision.map((rev, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                    <span>{rev}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Suggested Home Supportive Activities */}
      <div className="bg-white rounded-3xl p-6 border border-[#D5E9DC] shadow-sm space-y-4">
        <h3 className="font-bold text-[#18352A] text-sm flex items-center gap-2">
          <Smile className="w-4 h-4 text-[#006A4E]" />
          Encouraging Supportive Activities for Parents at Home
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs text-[#18352A]">
          <div className="p-4 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC] space-y-1.5">
            <span className="font-bold text-[#006A4E] block">1. 5-Minute Dinner Discussion</span>
            <p className="text-[#64776B] text-[11px] leading-relaxed">
              Ask your child to explain one interesting science fact they learned today in your native language ({profile.tutorLanguage}).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC] space-y-1.5">
            <span className="font-bold text-[#006A4E] block">2. Gentle Hydration & Screen Breaks</span>
            <p className="text-[#64776B] text-[11px] leading-relaxed">
              Remind them to look away at green trees for 20 seconds during their 3-minute study breaks.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC] space-y-1.5">
            <span className="font-bold text-[#006A4E] block">3. Celebrate Effort, Not Just Marks</span>
            <p className="text-[#64776B] text-[11px] leading-relaxed">
              Praise their 5-day daily streak and curiosity in asking doubts through the AI Tutor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
