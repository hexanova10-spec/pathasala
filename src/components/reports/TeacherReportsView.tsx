import React, { useState } from 'react';
import { UserRole, StudentReport, ParentReport, StudentProfile } from '../../types';
import { INITIAL_STUDENT_REPORTS, INITIAL_PARENT_REPORTS } from '../../data/mockStore';
import {
  FileText,
  Printer,
  Share2,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
  Edit,
  Eye,
  Send,
  Lock,
  Globe,
  Award,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface TeacherReportsViewProps {
  role: UserRole;
  profile?: StudentProfile;
}

export const TeacherReportsView: React.FC<TeacherReportsViewProps> = ({ role, profile }) => {
  const [studentReports, setStudentReports] = useState<StudentReport[]>(
    INITIAL_STUDENT_REPORTS
  );
  const [reportSaveError, setReportSaveError] = useState<string | null>(null);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [parentReports, setParentReports] = useState<ParentReport[]>(
    INITIAL_PARENT_REPORTS
  );

  const [selectedReport, setSelectedReport] = useState<StudentReport | null>(
    studentReports[0]
  );
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [publishSuccessNotice, setPublishSuccessNotice] = useState<string | null>(null);

  // New report form states
  const [reportStudentName, setReportStudentName] = useState('Subhashree Nayak');
  const [reportClassNum, setReportClassNum] = useState(10);
  const [reportSubject, setReportSubject] = useState('All Subjects (BSE Matriculation)');
  const [reportPeriod, setReportPeriod] = useState('October 1 – October 14, 2026');
  const [reportFrequency, setReportFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [confidentialTeacherNote, setConfidentialTeacherNote] = useState(
    'Student demonstrates excellent focus. Recommend 10-year BSE question bank practice for time management.'
  );
  const [releasedParentFeedback, setReleasedParentFeedback] = useState(
    'Subhashree is making admirable progress in Class 10. She uses her regional Odia explanations alongside English technical terms very effectively. Please encourage her to take short breaks during evening sessions.'
  );
  const [newReportStudentId, setNewReportStudentId] = useState('BSE-2026-OD-8819');
  const [newReportStudentName, setNewReportStudentName] = useState('Subhashree Nayak');
  const [newReportClass, setNewReportClass] = useState('10');
  const [newReportPeriod, setNewReportPeriod] = useState('October 15 – October 31, 2026');
  const [newReportSubject, setNewReportSubject] = useState('All Subjects');
  const [newReportLessons, setNewReportLessons] = useState('0');
  const [newReportHomework, setNewReportHomework] = useState('0');
  const [newReportQuiz, setNewReportQuiz] = useState('0');

  // If in Parent role, show published reports only!
  if (role === 'parent') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-[#D5E9DC] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFF3E8] border border-[#D5E9DC] text-[#006A4E] text-xs font-bold mb-2">
              <FileText className="w-3.5 h-3.5" />
              Published Academic Reports
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#18352A] tracking-tight">
              {profile?.name || 'Subhashree'}'s Published Reports
            </h1>
            <p className="text-xs text-[#64776B] mt-0.5">
              Verified teacher evaluations, learning achievements, and home support recommendations.
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl border border-[#D5E9DC] text-[#18352A] font-bold text-xs hover:bg-[#F4FBF6] transition flex items-center gap-2 self-start sm:self-auto"
          >
            <Printer className="w-4 h-4 text-[#006A4E]" />
            <span>Print Report</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {parentReports.map((prep) => (
            <div
              key={prep.id}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D5E9DC] shadow-sm space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#D5E9DC]">
                <div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#DFF3E8] text-[#006A4E] border border-[#D5E9DC]">
                    Official Published Report • Class {prep.classNum}
                  </span>
                  <h2 className="text-lg font-black text-[#18352A] mt-2">
                    Learning Progress & Mastery Assessment
                  </h2>
                  <p className="text-xs text-[#64776B]">
                    Reporting Period: {prep.reportingPeriod} • Published: {prep.publishedAt}
                  </p>
                </div>
                <div className="text-xs text-[#64776B] sm:text-right">
                  <span className="font-bold text-[#18352A] block">Evaluated by:</span>
                  <span>{prep.teacherName}</span>
                </div>
              </div>

              {/* KPI metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC]">
                  <span className="text-[10px] font-bold text-[#64776B] block">Lessons Finished</span>
                  <strong className="text-lg font-black text-[#18352A]">{prep.lessonsCompleted} Lessons</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC]">
                  <span className="text-[10px] font-bold text-[#64776B] block">Homework Status</span>
                  <strong className="text-xs font-bold text-[#006A4E]">{prep.homeworkStatus}</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC]">
                  <span className="text-[10px] font-bold text-[#64776B] block">Quiz Performance</span>
                  <strong className="text-xs font-bold text-[#18352A]">{prep.quizPerformance}</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#DFF3E8] border border-[#D5E9DC]">
                  <span className="text-[10px] font-bold text-[#004B38] block">Overall Grade</span>
                  <strong className="text-lg font-black text-[#006A4E]">A+ (Matric Track)</strong>
                </div>
              </div>

              {/* Released Teacher Feedback */}
              <div className="p-4 rounded-2xl bg-[#DFF3E8]/50 border border-[#D5E9DC] space-y-1 text-xs">
                <span className="text-[10px] font-bold text-[#004B38] uppercase tracking-wider block">
                  Teacher Feedback Released to Parents:
                </span>
                <p className="text-[#18352A] leading-relaxed italic">
                  "{prep.teacherFeedback}"
                </p>
              </div>

              {/* Positive Achievements & Revision */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC] space-y-2">
                  <span className="font-bold text-[#006A4E] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Key Student Achievements
                  </span>
                  <ul className="space-y-1.5 text-[#18352A]">
                    {prep.positiveAchievements.map((ach, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#006A4E] mt-1.5 shrink-0" />
                        <span>{ach}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC] space-y-2">
                  <span className="font-bold text-amber-700 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Recommended Home Revision
                  </span>
                  <ul className="space-y-1.5 text-[#18352A]">
                    {prep.recommendedRevision.map((rev, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                        <span>{rev}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Teacher Role Workflow: Create, Draft, Publish, 12 Sections
  const handleCreateReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReportSaveError(null);
    setIsSavingReport(true);
    try {
      const token = localStorage.getItem('pathashala_token');
      if (!token) throw new Error('Please sign in again as a teacher before creating a report.');
      const template = INITIAL_STUDENT_REPORTS[0];
      const classNum = Number(newReportClass);
      const lessons = Number(newReportLessons);
      const homework = Number(newReportHomework);
      const quiz = Number(newReportQuiz);
      const report: StudentReport = {
        ...template,
        id: `REP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        studentId: newReportStudentId.trim(),
        studentName: newReportStudentName.trim(),
        classNum,
        assignedClasses: [classNum],
        assignedClassesInfo: [classNum],
        subject: newReportSubject.trim(),
        reportingPeriod: newReportPeriod.trim(),
        frequency: reportFrequency,
        status: 'Draft',
        createdAt: new Date().toLocaleString(),
        publishedAt: undefined,
        lessonsCompleted: lessons,
        homeworkCompletionRate: homework,
        quizAccuracy: quiz,
        studentDetails: {
          ...template.studentDetails,
          name: newReportStudentName.trim(),
          id: newReportStudentId.trim(),
          board: template.studentDetails.board
        },
        teacherComments: {
          confidentialNote: confidentialTeacherNote,
          releasedFeedback: releasedParentFeedback
        }
      };
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(report)
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'The report could not be saved.');
      const savedReport = data.report as StudentReport;
      setStudentReports((previous) => [savedReport, ...previous]);
      setSelectedReport(savedReport);
      setIsCreatingReport(false);
      setPublishSuccessNotice('New report saved as a draft. Review it and publish it to the Parent Portal when ready.');
      setTimeout(() => setPublishSuccessNotice(null), 5000);
    } catch (error) {
      setReportSaveError(error instanceof Error ? error.message : 'Could not save the report. Please try again.');
    } finally {
      setIsSavingReport(false);
    }
  };

  const handlePublishReport = async (rep: StudentReport) => {
    const token = localStorage.getItem('pathashala_token');
    if (!token) {
      setReportSaveError('Please sign in again as a teacher before publishing.');
      return;
    }
    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(rep.id)}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not publish this report.');
      const updated = { ...rep, ...data.studentReport, status: 'Published' as const };
      setStudentReports((prev) => prev.map((r) => (r.id === rep.id ? updated : r)));
      setSelectedReport(updated);
      if (data.parentReport) setParentReports((prev) => [data.parentReport, ...prev.filter((item) => item.id !== data.parentReport.id)]);
    } catch (error) {
      setReportSaveError(error instanceof Error ? error.message : 'Could not publish this report.');
      return;
    }

    // Also push to parent reports
    const parentCopy: ParentReport = {
      id: `PREP-${rep.id}`,
      studentReportId: rep.id,
      studentId: rep.studentId,
      studentName: rep.studentName,
      classNum: rep.classNum,
      reportingPeriod: rep.reportingPeriod,
      publishedAt: new Date().toLocaleString(),
      teacherName: rep.teacherName,
      lessonsCompleted: rep.lessonsCompleted,
      homeworkStatus: `${rep.homeworkCompletionRate}% Homework Completed`,
      quizPerformance: `${rep.quizAccuracy}% Quiz Accuracy`,
      subjectMastery: rep.subjectMastery,
      topicsRequiringSupport: rep.topicsRequiringPractice,
      positiveAchievements: [
        'Exemplary conceptual understanding in physics.',
        'Continuous 5-day daily focus streak.'
      ],
      teacherFeedback: rep.teacherComments.releasedFeedback,
      recommendedRevision: rep.recommendedNextSteps,
      status: 'Published'
    };

    setParentReports([parentCopy, ...parentReports]);
    setPublishSuccessNotice('Report published successfully! It is now accessible in the Parent Portal.');
    setTimeout(() => setPublishSuccessNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-[#D5E9DC] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFF3E8] border border-[#D5E9DC] text-[#006A4E] text-xs font-bold mb-2">
            <FileText className="w-3.5 h-3.5" />
            Teacher Report Management System
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#18352A] tracking-tight">
            Comprehensive 12-Section Student & Parent Reports
          </h1>
          <p className="text-xs text-[#64776B] mt-0.5">
            Configure periodic evaluations with private teacher annotations and released parent feedback.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingReport(true)}
          className="px-5 py-2.5 rounded-xl bg-[#006A4E] hover:bg-[#004B38] text-white font-bold text-xs shadow-md transition flex items-center gap-2 self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Prepare New Report</span>
        </button>
      </div>

      {reportSaveError && (
        <div role="alert" className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold">
          {reportSaveError}
        </div>
      )}

      {publishSuccessNotice && (
        <div className="p-3.5 rounded-2xl bg-[#DFF3E8] border border-[#D5E9DC] text-[#004B38] text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#006A4E]" />
          <span>{publishSuccessNotice}</span>
        </div>
      )}

      {/* Grid: Report Selector & 12-Section Report Document */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Reports List */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-[#18352A] uppercase tracking-wider block">
            Generated Reports ({studentReports.length})
          </span>

          {studentReports.map((rep) => {
            const isSelected = selectedReport?.id === rep.id;
            return (
              <div
                key={rep.id}
                onClick={() => setSelectedReport(rep)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  isSelected
                    ? 'bg-white border-[#006A4E] ring-2 ring-[#006A4E]/20 shadow-sm'
                    : 'bg-white border-[#D5E9DC] hover:border-[#006A4E]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DFF3E8] text-[#006A4E]">
                    Class {rep.classNum} • {rep.frequency}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      rep.status === 'Published'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {rep.status}
                  </span>
                </div>

                <h3 className="font-bold text-xs text-[#18352A]">{rep.studentName}</h3>
                <p className="text-[11px] text-[#64776B]">{rep.reportingPeriod}</p>
              </div>
            );
          })}
        </div>

        {/* Right 2 Cols: 12-Section Report Document */}
        <div className="lg:col-span-2 space-y-6">
          {selectedReport && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D5E9DC] shadow-sm space-y-6">
              {/* Document Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#D5E9DC]">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedReport.status === 'Published'
                        ? 'bg-[#DFF3E8] text-[#004B38]'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    Status: {selectedReport.status}
                  </span>
                  <span className="text-xs text-[#64776B]">
                    Created: {selectedReport.createdAt}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="p-2 rounded-xl border border-[#D5E9DC] text-xs font-bold text-[#18352A] hover:bg-[#F4FBF6] transition flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#006A4E]" />
                    <span>Print PDF</span>
                  </button>

                  {selectedReport.status !== 'Published' && (
                    <button
                      onClick={() => handlePublishReport(selectedReport)}
                      className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#004B38] text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Publish to Parent Portal</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 12 Report Sections Header */}
              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold text-[#006A4E] uppercase tracking-widest">
                  PATHASHALA AI • ACADEMIC PROGRESS ASSESSMENT
                </span>
                <h2 className="text-xl font-black text-[#18352A]">
                  Student Performance & Mastery Dossier
                </h2>
                <p className="text-xs text-[#64776B]">{selectedReport.reportingPeriod}</p>
              </div>

              {/* Sections 1 & 2: Student Details & Assigned Classes */}
              <div className="p-4 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC] grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-[#64776B] font-bold block">1. Student Name</span>
                  <strong className="text-[#18352A]">{selectedReport.studentDetails.name}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#64776B] font-bold block">Roll / ID</span>
                  <strong className="text-[#18352A]">{selectedReport.studentDetails.id}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#64776B] font-bold block">School & Board</span>
                  <strong className="text-[#18352A]">{selectedReport.studentDetails.board}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#64776B] font-bold block">2. Assigned Classes</span>
                  <strong className="text-[#006A4E]">
                    Class {selectedReport.assignedClasses.join(' & Class ')} (Max 2 Limit)
                  </strong>
                </div>
              </div>

              {/* Sections 3, 4, 5, 6, 7: Core Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl border border-[#D5E9DC] bg-white">
                  <span className="text-[10px] font-bold text-[#64776B] block">3. Lessons Completed</span>
                  <strong className="text-lg font-black text-[#18352A]">
                    {selectedReport.lessonsCompleted} Chapters
                  </strong>
                </div>

                <div className="p-3.5 rounded-2xl border border-[#D5E9DC] bg-white">
                  <span className="text-[10px] font-bold text-[#64776B] block">4. Study Session Summary</span>
                  <strong className="text-xs font-bold text-[#006A4E] block">
                    {selectedReport.studySessionSummary.totalHours} hrs focused
                  </strong>
                  <span className="text-[10px] text-[#64776B]">
                    Focus Score: {selectedReport.studySessionSummary.focusScorePercent}%
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl border border-[#D5E9DC] bg-white">
                  <span className="text-[10px] font-bold text-[#64776B] block">5. Daily Activity</span>
                  <strong className="text-xs font-bold text-[#18352A] block">
                    {selectedReport.dailyActivitySummary.daysActive} Active Days
                  </strong>
                  <span className="text-[10px] text-[#64776B]">
                    ~{selectedReport.dailyActivitySummary.averageMinutesPerDay} min/day
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl border border-[#D5E9DC] bg-white">
                  <span className="text-[10px] font-bold text-[#64776B] block">6. Homework Completion</span>
                  <strong className="text-lg font-black text-[#006A4E]">
                    {selectedReport.homeworkCompletionRate}%
                  </strong>
                </div>

                <div className="p-3.5 rounded-2xl border border-[#D5E9DC] bg-white">
                  <span className="text-[10px] font-bold text-[#64776B] block">7. Quiz Accuracy</span>
                  <strong className="text-lg font-black text-[#18352A]">
                    {selectedReport.quizAccuracy}%
                  </strong>
                </div>

                <div className="p-3.5 rounded-2xl border border-[#D5E9DC] bg-white">
                  <span className="text-[10px] font-bold text-[#64776B] block">10. Learning Improvement</span>
                  <strong className="text-xs font-bold text-emerald-700 block">
                    {selectedReport.learningImprovementTrend}
                  </strong>
                </div>
              </div>

              {/* Section 8: Subject Mastery Breakdown */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#18352A] uppercase tracking-wider block">
                  8. Subject Mastery Breakdown
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {selectedReport.subjectMastery.map((sub) => (
                    <div
                      key={sub.subject}
                      className="p-3 rounded-xl bg-[#F4FBF6] border border-[#D5E9DC] flex items-center justify-between"
                    >
                      <span className="font-semibold text-[#18352A]">{sub.subject}</span>
                      <span className="font-extrabold text-[#006A4E]">{sub.score}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 9: Topics Requiring Practice */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs">
                <span className="font-bold text-amber-900 block">
                  9. Diagnostic: Topics Requiring Further Practice
                </span>
                <ul className="space-y-1 text-amber-950">
                  {selectedReport.topicsRequiringPractice.map((t, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Section 11: Teacher Comments (Confidential vs Released) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC] space-y-1.5">
                  <span className="font-bold text-[#64776B] flex items-center gap-1 text-[11px]">
                    <Lock className="w-3.5 h-3.5 text-[#64776B]" />
                    11A. Confidential Teacher Notes (School Internal):
                  </span>
                  <p className="text-[#18352A] leading-relaxed">
                    {selectedReport.teacherComments.confidentialNote}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#DFF3E8]/60 border border-[#D5E9DC] space-y-1.5">
                  <span className="font-bold text-[#004B38] flex items-center gap-1 text-[11px]">
                    <Globe className="w-3.5 h-3.5 text-[#006A4E]" />
                    11B. Released Parent & Student Feedback:
                  </span>
                  <p className="text-[#003627] leading-relaxed">
                    "{selectedReport.teacherComments.releasedFeedback}"
                  </p>
                </div>
              </div>

              {/* Section 12: Recommended Next Steps */}
              <div className="p-4 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC] space-y-2 text-xs">
                <span className="font-bold text-[#006A4E] block">
                  12. Recommended Academic Next Steps
                </span>
                <ul className="space-y-1.5 text-[#18352A]">
                  {selectedReport.recommendedNextSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#006A4E] mt-1.5 shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {isCreatingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10291F]/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="new-report-title">
          <form onSubmit={handleCreateReport} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="new-report-title" className="text-xl font-black text-[#18352A]">Prepare New Student Report</h2>
                <p className="mt-1 text-sm text-[#64776B]">Save a draft first, review it, then publish it for the linked parent.</p>
              </div>
              <button type="button" onClick={() => { setIsCreatingReport(false); setReportSaveError(null); }} className="rounded-xl border border-[#D5E9DC] px-3 py-2 text-sm font-bold text-[#18352A]">Close</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-bold text-[#18352A]">Student full name
                <input required value={newReportStudentName} onChange={(e) => setNewReportStudentName(e.target.value)} className="w-full rounded-xl border border-[#D5E9DC] p-3 text-sm font-normal" placeholder="Student name" />
              </label>
              <label className="space-y-1 text-xs font-bold text-[#18352A]">Student ID (must match account)
                <input required value={newReportStudentId} onChange={(e) => setNewReportStudentId(e.target.value)} className="w-full rounded-xl border border-[#D5E9DC] p-3 text-sm font-normal" placeholder="Student ID" />
              </label>
              <label className="space-y-1 text-xs font-bold text-[#18352A]">Class
                <select value={newReportClass} onChange={(e) => setNewReportClass(e.target.value)} className="w-full rounded-xl border border-[#D5E9DC] p-3 text-sm font-normal">{Array.from({length: 12}, (_, i) => String(i + 1)).map((value) => <option key={value} value={value}>Class {value}</option>)}</select>
              </label>
              <label className="space-y-1 text-xs font-bold text-[#18352A]">Subject
                <input required value={newReportSubject} onChange={(e) => setNewReportSubject(e.target.value)} className="w-full rounded-xl border border-[#D5E9DC] p-3 text-sm font-normal" />
              </label>
              <label className="space-y-1 text-xs font-bold text-[#18352A]">Reporting period
                <input required value={newReportPeriod} onChange={(e) => setNewReportPeriod(e.target.value)} className="w-full rounded-xl border border-[#D5E9DC] p-3 text-sm font-normal" />
              </label>
              <label className="space-y-1 text-xs font-bold text-[#18352A]">Report frequency
                <select value={reportFrequency} onChange={(e) => setReportFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')} className="w-full rounded-xl border border-[#D5E9DC] p-3 text-sm font-normal"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
              </label>
              <label className="space-y-1 text-xs font-bold text-[#18352A]">Lessons completed
                <input required type="number" min="0" value={newReportLessons} onChange={(e) => setNewReportLessons(e.target.value)} className="w-full rounded-xl border border-[#D5E9DC] p-3 text-sm font-normal" />
              </label>
              <label className="space-y-1 text-xs font-bold text-[#18352A]">Homework completion (%)
                <input required type="number" min="0" max="100" value={newReportHomework} onChange={(e) => setNewReportHomework(e.target.value)} className="w-full rounded-xl border border-[#D5E9DC] p-3 text-sm font-normal" />
              </label>
              <label className="space-y-1 text-xs font-bold text-[#18352A]">Quiz accuracy (%)
                <input required type="number" min="0" max="100" value={newReportQuiz} onChange={(e) => setNewReportQuiz(e.target.value)} className="w-full rounded-xl border border-[#D5E9DC] p-3 text-sm font-normal" />
              </label>
              <label className="space-y-1 text-xs font-bold text-[#18352A] sm:col-span-2">Private teacher note
                <textarea value={confidentialTeacherNote} onChange={(e) => setConfidentialTeacherNote(e.target.value)} rows={3} className="w-full rounded-xl border border-[#D5E9DC] p-3 text-sm font-normal" />
              </label>
              <label className="space-y-1 text-xs font-bold text-[#18352A] sm:col-span-2">Feedback visible to parent
                <textarea required value={releasedParentFeedback} onChange={(e) => setReleasedParentFeedback(e.target.value)} rows={3} className="w-full rounded-xl border border-[#D5E9DC] p-3 text-sm font-normal" />
              </label>
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-[#D5E9DC] pt-4">
              <button type="button" onClick={() => { setIsCreatingReport(false); setReportSaveError(null); }} className="rounded-xl border border-[#D5E9DC] px-4 py-2.5 text-sm font-bold text-[#18352A]">Cancel</button>
              <button type="submit" disabled={isSavingReport} className="rounded-xl bg-[#006A4E] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{isSavingReport ? 'Saving…' : 'Save Draft Report'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
