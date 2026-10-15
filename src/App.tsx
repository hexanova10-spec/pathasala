/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  StudentProfile,
  UserRole,
  User,
  SchoolBoard,
  AccessibilitySettings
} from './types';
import { INITIAL_STUDENT_PROFILE, DEMO_USERS } from './data/mockStore';
import { StudentDashboardView } from './components/dashboard/StudentDashboardView';
import { AITutorView } from './components/tutor/AITutorView';
import { AskFromPhotoView } from './components/photo/AskFromPhotoView';
import { PracticeZoneView } from './components/practice/PracticeZoneView';
import { LearningPathView } from './components/learningpath/LearningPathView';
import { AIStudyStudioView } from './components/studio/AIStudyStudioView';
import { OfflineCentreView } from './components/offline/OfflineCentreView';
import { CareerExplorerView } from './components/career/CareerExplorerView';
import { TeacherModeView } from './components/teacher/TeacherModeView';
import { ParentModeView } from './components/parent/ParentModeView';
import { StudyFocusView } from './components/focus/StudyFocusView';
import { HomeworkView } from './components/homework/HomeworkView';
import { MyProgressView } from './components/progress/MyProgressView';
import { TeacherReportsView } from './components/reports/TeacherReportsView';
import { CameraAlertsView } from './components/camera/CameraAlertsView';
import { AILearningInsightsView } from './components/insights/AILearningInsightsView';
import { DailyActivityView } from './components/activity/DailyActivityView';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { AuthModal } from './components/auth/AuthModal';
import { LoginPage } from './components/auth/LoginPage';
import { ClassSelector } from './components/classes/ClassSelector';
import { LanguageCenter } from './components/language/LanguageCenter';
import {
  LayoutDashboard,
  MessageSquare,
  Camera,
  CheckSquare,
  MapPin,
  FileText,
  Wifi,
  WifiOff,
  Compass,
  GraduationCap,
  Heart,
  Settings,
  Menu,
  X,
  Globe,
  Sparkles,
  ChevronDown,
  User as UserIcon,
  ShieldCheck,
  Eye,
  Clock,
  Bell,
  Activity,
  AlertTriangle,
  LogIn,
  LogOut,
  FileSpreadsheet,
  BookOpen
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(DEMO_USERS[0]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<UserRole>('student');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Load persisted student profile and active subject if available
  const [activeSubject, setActiveSubject] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('pathashala_subject') || 'Mathematics';
    return 'Mathematics';
  });

  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [parentFocusNotice, setParentFocusNotice] = useState<{ id: string; title: string; message: string } | null>(null);

  // Parent portal polls the prototype notification inbox while open.
  // Background/mobile push delivery requires Web Push or FCM setup beyond this demo.
  useEffect(() => {
    if (!isAuthenticated || role !== 'parent' || !currentUser?.id) {
      setParentFocusNotice(null);
      return;
    }
    let cancelled = false;
    let lastNoticeId = '';
    const poll = async () => {
      try {
        const response = await fetch(`/api/notifications?recipientRole=parent&recipientId=${encodeURIComponent(currentUser.id)}`);
        if (!response.ok) return;
        const data = await response.json();
        const notice = (data.notifications || []).find((item: any) =>
          (item.category === 'focus' || item.category === 'alert') && !item.read
        );
        if (!cancelled && notice) {
          setParentFocusNotice({ id: notice.id, title: notice.title, message: notice.message });
          if (notice.id !== lastNoticeId) {
            lastNoticeId = notice.id;
            if ('Notification' in window && Notification.permission === 'granted') {
              try { new Notification(notice.title, { body: notice.message, tag: notice.id }); } catch {}
            }
            if (notice.category === 'alert') {
              try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                  const audio = new AudioContextClass();
                  const oscillator = audio.createOscillator();
                  const gain = audio.createGain();
                  oscillator.frequency.value = 740;
                  gain.gain.setValueAtTime(0.0001, audio.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 0.04);
                  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.55);
                  oscillator.connect(gain);
                  gain.connect(audio.destination);
                  oscillator.start();
                  oscillator.stop(audio.currentTime + 0.6);
                  oscillator.onended = () => { void audio.close(); };
                }
              } catch {}
            }
          }
        }
      } catch (error) {
        console.warn('Parent notification inbox is temporarily unavailable:', error);
      }
    };
    void poll();
    const timer = window.setInterval(() => { void poll(); }, 10000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [isAuthenticated, role, currentUser?.id]);

  // Gamification state
  const [xpPoints, setXpPoints] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedXp = localStorage.getItem('pathashala_xp');
      if (savedXp) return parseInt(savedXp, 10);
    }
    return 420;
  });

  const [streakDays, setStreakDays] = useState(5);

  // Student Profile (strictly max 2 assigned classes)
  const [profile, setProfile] = useState<StudentProfile>(() => {
    if (typeof window !== 'undefined') {
      const savedProfile = localStorage.getItem('pathashala_profile');
      if (savedProfile) {
        try {
          return JSON.parse(savedProfile);
        } catch (e) {
          console.warn('Profile parse error:', e);
        }
      }
    }
    return INITIAL_STUDENT_PROFILE;
  });

  // Save profile changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pathashala_profile', JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to save profile to localStorage:', e);
    }
  }, [profile]);

  // Keep the authenticated student's latest profile in the shared backend database.
  // Teacher and parent portals read this record from the same server, not localStorage.
  useEffect(() => {
    if (!isAuthenticated || role !== 'student' || !currentUser?.id || profile.id !== currentUser.id) return;
    const token = localStorage.getItem('pathashala_token');
    if (!token) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profile }),
        signal: controller.signal
      }).then((response) => {
        if (!response.ok) console.warn('Student profile sync failed:', response.status);
      }).catch((error) => {
        if (error?.name !== 'AbortError') console.warn('Student profile could not sync yet:', error);
      });
    }, 350);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [profile, isAuthenticated, role, currentUser?.id]);

  useEffect(() => {
    try {
      localStorage.setItem('pathashala_subject', activeSubject);
    } catch (e) {}
  }, [activeSubject]);

  useEffect(() => {
    try {
      localStorage.setItem('pathashala_xp', xpPoints.toString());
    } catch (e) {}
  }, [xpPoints]);

  const handleUpdateLanguages = (update: Partial<StudentProfile>) => {
    setProfile((prev) => ({ ...prev, ...update }));
  };

  const handleUpdateXp = (earned: number) => {
    setXpPoints((prev) => prev + earned);
  };

  const handleAuthSuccess = (user: User, newRole: UserRole) => {
    setCurrentUser(user);
    if (newRole === 'student') {
      const chosenSubject = user.preferredSubject || 'Mathematics';
      const registeredLanguage = user.preferredLanguage || 'English';
      const assignedClasses = (user.assignedClasses || [10]).filter((value) => Number.isInteger(value) && value >= 1 && value <= 12).slice(0, 2);
      const safeClasses = assignedClasses.length ? assignedClasses : [10];
      setActiveSubject(chosenSubject);
      localStorage.setItem('pathashala_subject', chosenSubject);
      localStorage.setItem('pathashala_language', registeredLanguage);
      localStorage.setItem('pathashala_user', JSON.stringify(user));

      // Keep the seeded demo learner's rich sample dashboard, but build every
      // newly registered student's profile from that student's own account data.
      if (user.id === INITIAL_STUDENT_PROFILE.id) {
        setProfile({
          ...INITIAL_STUDENT_PROFILE,
          tutorLanguage: registeredLanguage,
          interfaceLanguage: registeredLanguage,
          textbookLanguage: registeredLanguage,
          subjects: [chosenSubject]
        });
      } else {
        const firstName = user.name.trim().split(/\s+/)[0] || user.name;
        setProfile({
          id: user.id,
          name: user.name,
          nickname: firstName,
          studentId: user.identifier || user.id,
          email: user.email,
          assignedClasses: safeClasses,
          classNum: safeClasses[0],
          schoolBoard: 'Odisha State Board (BSE/CHSE)',
          schoolName: user.school || 'School not provided',
          interfaceLanguage: registeredLanguage,
          tutorLanguage: registeredLanguage,
          textbookLanguage: registeredLanguage,
          subjects: [chosenSubject],
          learningGoals: [],
          accessibility: {
            fontSize: 'normal',
            highContrast: false,
            speechSpeed: 1.0,
            dyslexiaFont: false
          },
          parentLinked: false,
          parentName: undefined,
          parentEmail: undefined
        });
      }
    }
    setIsAuthenticated(true);
    setRole(newRole);
    if (newRole === 'teacher') {
      setActiveTab('teacher');
    } else if (newRole === 'parent') {
      setActiveTab('parent');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pathashala_token');
    localStorage.removeItem('pathashala_user');
    setIsAuthenticated(false);
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
    setIsAuthModalOpen(false);
    setRole('student');
    setActiveTab('dashboard');
  };

  // Switch between the student's 2 assigned classes
  const handleSwitchAssignedClass = (classNum: number) => {
    setProfile((prev) => ({
      ...prev,
      classNum
    }));
  };

  // Role-based Nav items
  const getNavItems = () => {
    if (role === 'student') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'tutor', label: 'AI Tutor', icon: MessageSquare, badge: 'Agent' },
        { id: 'focus-session', label: 'Study Focus Mode', icon: Clock },
        { id: 'homework', label: 'Homework & Tasks', icon: FileText },
        { id: 'my-progress', label: 'My Progress Board', icon: Activity },
        { id: 'practice', label: 'Practice Zone', icon: CheckSquare },
        { id: 'path', label: 'Learning Paths', icon: MapPin },
        { id: 'photo', label: 'Ask from Photo', icon: Camera },
        { id: 'studio', label: 'Study Notes & Studio', icon: FileSpreadsheet },
        { id: 'offline', label: 'Offline Lessons', icon: isSimulatedOffline ? WifiOff : Wifi },
        { id: 'career', label: 'Career Explorer', icon: Compass, hiddenForPrimary: profile.classNum < 8 }
      ];
    } else if (role === 'teacher') {
      return [
        { id: 'teacher', label: 'Teacher Dashboard', icon: LayoutDashboard },
        { id: 'teacher-homework', label: 'Homework Management', icon: FileText },
        { id: 'teacher-reports', label: '12-Section Reports', icon: FileSpreadsheet },
        { id: 'camera-alerts', label: 'Camera Alerts', icon: Camera, badge: '1 New' },
        { id: 'teacher-insights', label: 'AI Learning Insights', icon: Sparkles },
        { id: 'teacher-activity', label: 'Student Activity Log', icon: Activity },
        { id: 'tutor', label: 'Test AI Tutor', icon: MessageSquare }
      ];
    } else {
      // Parent Portal
      return [
        { id: 'parent', label: 'Parent Dashboard', icon: LayoutDashboard },
        { id: 'parent-reports', label: 'Published Reports', icon: FileSpreadsheet },
        { id: 'parent-homework', label: 'Homework Status', icon: FileText },
        { id: 'my-progress', label: 'Child Learning Progress', icon: Activity }
      ];
    }
  };

  const navItems = getNavItems();

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  if (!isAuthenticated) return (
    <>
      <LoginPage onLoginSuccess={handleAuthSuccess} onRegisterClick={() => { setAuthModalMode('register'); setIsAuthModalOpen(true); }} />
      <AuthModal isOpen={isAuthModalOpen} initialMode={authModalMode} onClose={() => setIsAuthModalOpen(false)} onSuccess={handleAuthSuccess} />
    </>
  );

  return (
    <div
      className={`min-h-screen bg-[#F4FBF6] text-[#18352A] flex flex-col transition-colors duration-200 ${
        profile.accessibility.highContrast ? 'contrast-125 bg-[#EBF7F0]' : ''
      }`}
    >
      {/* Top Demo Mode & Hackathon Banner in Bottle Green */}
      <div className="bg-[#003627] text-[#DFF3E8] text-[11px] sm:text-xs py-1.5 px-4 flex items-center justify-between border-b border-[#004B38]">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="font-bold text-[#A5D9C2] uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Nextech 2.0 Hackathon
          </span>
          <span className="text-[#495D51]">|</span>
          <span className="hidden sm:inline font-medium text-white">
            PATHASHALA AI • One AI. Every Language. Every Learner.
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#006A4E] text-[#DFF3E8] font-bold text-[10px] border border-[#A5D9C2]/30">
            {role.toUpperCase()} PORTAL
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsSimulatedOffline(!isSimulatedOffline)}
            className={`flex items-center gap-1 font-semibold transition px-2 py-0.5 rounded-md ${
              isSimulatedOffline
                ? 'bg-amber-500 text-white'
                : 'text-[#DFF3E8] hover:text-white'
            }`}
          >
            {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isSimulatedOffline ? 'Offline Active' : 'Online'}</span>
          </button>

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1 text-[#DFF3E8] hover:text-white transition"
            title="Accessibility Preferences"
          >
            <Eye className="w-3.5 h-3.5 text-[#A5D9C2]" />
            <span className="hidden sm:inline">Accessibility</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-[#DFF3E8] hover:text-white transition font-bold"
            title="Log out of this account"
          >
            <LogIn className="w-3.5 h-3.5 text-[#A5D9C2]" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </div>

      {/* Main App Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#D5E9DC] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Tagline */}
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => {
              if (role === 'teacher') setActiveTab('teacher');
              else if (role === 'parent') setActiveTab('parent');
              else setActiveTab('dashboard');
            }}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#004B38] via-[#006A4E] to-[#0B8457] flex items-center justify-center text-white shadow-md shadow-[#004B38]/20 shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-[#18352A] text-base sm:text-lg tracking-tight">
                  PATHASHALA AI
                </span>
              </div>
              <p className="text-[10px] text-[#006A4E] font-bold hidden sm:block tracking-wide uppercase">
                One AI. Every Language. Every Learner.
              </p>
            </div>
          </div>

          {/* Quick Context Switchers (Class, Language, Role, Notifications) */}
          <div className="hidden lg:flex items-center gap-2.5">
            {/* Portal is fixed to the authenticated account. Log out before changing accounts. */}

            {/* Strict Two-Class Assigned Picker */}
            {role === 'student' && (
              <button
                onClick={() => setIsClassModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DFF3E8] hover:bg-[#D5E9DC] text-[#004B38] text-xs font-bold transition border border-[#D5E9DC]"
              >
                <GraduationCap className="w-4 h-4 text-[#006A4E]" />
                <span>Class {profile.classNum}</span>
                <span className="text-[10px] font-normal text-[#006A4E]">
                  ({profile.schoolBoard.split(' ')[0]})
                </span>
                <ChevronDown className="w-3 h-3 text-[#006A4E]" />
              </button>
            )}

            {role === 'student' && (
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F4FBF6] border border-[#D5E9DC] text-xs font-bold text-[#006A4E]">
                <BookOpen className="w-4 h-4" />
                <span>Subject</span>
                <select aria-label="Choose study subject" value={activeSubject} onChange={(e) => {
                  const subject = e.target.value;
                  setActiveSubject(subject);
                  localStorage.setItem('pathashala_subject', subject);
                  setProfile((prev) => ({ ...prev, subjects: [subject] }));
                }} className="max-w-32 bg-transparent outline-none">
                  {['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Odia', 'History', 'Geography', 'Computer Science'].map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                </select>
              </label>
            )}

            {/* Language Centre Picker */}
            <button
              onClick={() => setIsLanguageModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4FBF6] hover:bg-[#DFF3E8] text-[#006A4E] text-xs font-bold transition border border-[#D5E9DC]"
            >
              <Globe className="w-4 h-4 text-[#006A4E]" />
              <span>Tutor: {profile.tutorLanguage}</span>
              <ChevronDown className="w-3 h-3 text-[#006A4E]" />
            </button>

            {/* In-App Notifications Button */}
            <button
              onClick={() => setIsNotificationDrawerOpen(true)}
              className="relative p-2 rounded-xl bg-[#F4FBF6] hover:bg-[#DFF3E8] text-[#006A4E] border border-[#D5E9DC] transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center">
                2
              </span>
            </button>
          </div>

          {/* Responsive Actions and Profile Menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNotificationDrawerOpen(true)}
              className="p-2 rounded-xl bg-[#F4FBF6] text-[#006A4E] border border-[#D5E9DC] relative lg:hidden"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-600 text-white text-[8px] flex items-center justify-center">
                2
              </span>
            </button>
            <button
              onClick={() => setIsLanguageModalOpen(true)}
              className="p-2 rounded-xl bg-[#DFF3E8] text-[#006A4E] text-xs font-bold lg:hidden"
              title="Language Centre"
            >
              <Globe className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsClassModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[#DFF3E8] text-[#006A4E] text-xs font-bold lg:hidden"
              title="Class Selector"
            >
              Cl. {profile.classNum}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-[#18352A] hover:bg-[#F4FBF6] lg:hidden"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl border border-[#D5E9DC] bg-white px-2.5 py-2 hover:bg-[#F4FBF6] transition"
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                aria-label="Open profile menu"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#DFF3E8] text-[#006A4E]">
                  <UserIcon className="h-4 w-4" />
                </span>
                <span className="hidden sm:block max-w-28 text-left">
                  <span className="block truncate text-xs font-extrabold text-[#18352A]">{currentUser.name}</span>
                  <span className="block text-[10px] font-semibold capitalize text-[#64776B]">{role} profile</span>
                </span>
                <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-[#64776B]" />
              </button>

              {isProfileMenuOpen && (
                <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[#D5E9DC] bg-white p-2 shadow-xl">
                  <div className="border-b border-[#E2EEE6] px-3 py-2.5">
                    <p className="truncate text-sm font-extrabold text-[#18352A]">{currentUser.name}</p>
                    <p className="mt-0.5 text-xs capitalize text-[#64776B]">{role} account</p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="mt-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-700 transition hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-[#D5E9DC] shadow-xl px-4 py-4 space-y-3 animate-fadeIn">
          <div className="rounded-xl border border-[#D5E9DC] bg-[#F4FBF6] px-3 py-2 text-sm font-bold text-[#004B38]">
            Signed in as {role.charAt(0).toUpperCase() + role.slice(1)} · Log out to change account
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`p-3 rounded-xl text-left text-xs font-bold flex items-center gap-2 transition ${
                    isSelected
                      ? 'bg-[#006A4E] text-white shadow-sm'
                      : 'bg-[#F4FBF6] text-[#18352A] hover:bg-[#DFF3E8]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Workspace Body with Sidebar & Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* Desktop Sidebar Navigation in Bottle Green System */}
        <aside className="hidden lg:block w-60 shrink-0 space-y-4">
          <div className="bg-white rounded-3xl p-3 border border-[#D5E9DC] shadow-sm space-y-1">
            {navItems.map((item) => {
              if (item.hiddenForPrimary) return null;
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-left text-xs font-bold transition flex items-center justify-between group ${
                    isSelected
                      ? 'bg-[#006A4E] text-white shadow-md shadow-[#004B38]/20'
                      : 'text-[#64776B] hover:text-[#18352A] hover:bg-[#F4FBF6]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#64776B] group-hover:text-[#006A4E]'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-semibold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Student Profile Quick Widget */}
          <div className="bg-[#DFF3E8] rounded-3xl p-4 border border-[#D5E9DC] text-xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#006A4E] text-white font-black flex items-center justify-center text-xs shadow-xs">
                {profile.name[0]}
              </div>
              <div className="truncate">
                <span className="font-bold text-[#18352A] block truncate">
                  {profile.name}
                </span>
                <span className="text-[10px] text-[#006A4E] font-semibold">
                  Class {profile.classNum} Scholar (Odisha BSE)
                </span>
              </div>
            </div>
            <div className="pt-1 text-[11px] text-[#004B38] flex justify-between font-semibold">
              <span>Study Streak:</span>
              <strong className="text-amber-700 font-bold">{streakDays} Days 🔥</strong>
            </div>
          </div>
        </aside>

        {/* Dynamic Center View Container */}
        <main className="flex-1 min-w-0">
          {role === 'parent' && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D5E9DC] bg-white p-3 text-xs text-[#18352A]">
              <span className="font-semibold">Study focus alerts for linked students</span>
              {'Notification' in window && Notification.permission !== 'granted' && (
                <button type="button" onClick={() => { void Notification.requestPermission(); }} className="rounded-xl bg-[#006A4E] px-3 py-2 font-bold text-white hover:bg-[#004B38]">
                  Enable browser notifications
                </button>
              )}
            </div>
          )}
          {role === 'parent' && parentFocusNotice && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm" role="status" aria-live="polite">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">{parentFocusNotice.title}</p>
                <p className="mt-1 text-xs leading-relaxed">{parentFocusNotice.message}</p>
                <p className="mt-2 text-[10px] text-amber-800">Demo inbox alert. Keep the parent portal open; real lock-screen phone push requires push-service configuration.</p>
              </div>
              <button type="button" onClick={() => { const id = parentFocusNotice.id; setParentFocusNotice(null); void fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }).catch(() => {}); }} className="rounded-lg px-2 py-1 text-xs font-bold hover:bg-amber-100" aria-label="Dismiss focus alert">Dismiss</button>
            </div>
          )}
          {activeTab === 'dashboard' && (
            <StudentDashboardView
              profile={profile}
              activeSubject={activeSubject}
              xpPoints={xpPoints}
              streakDays={streakDays}
              isSimulatedOffline={isSimulatedOffline}
              onSelectSubject={(sub) => {
                setActiveSubject(sub);
                setActiveTab('tutor');
              }}
              onNavigateToTutor={() => setActiveTab('tutor')}
              onNavigateToPractice={() => setActiveTab('practice')}
              onNavigateToPath={() => setActiveTab('path')}
              onNavigateToStudio={() => setActiveTab('studio')}
              onNavigateToOffline={() => setActiveTab('offline')}
              onNavigateToHomework={() => setActiveTab('homework')}
              onNavigateToFocus={() => setActiveTab('focus-session')}
              onNavigateToProgress={() => setActiveTab('my-progress')}
              onNavigateToReports={() => setActiveTab('teacher-reports')}
              onOpenClassSelector={() => setIsClassModalOpen(true)}
              onOpenLanguageCenter={() => setIsLanguageModalOpen(true)}
              onSwitchAssignedClass={handleSwitchAssignedClass}
            />
          )}

          {activeTab === 'tutor' && (
            <AITutorView
              profile={profile}
              activeSubject={activeSubject}
              onUpdateProfile={(updated) => setProfile((p) => ({ ...p, ...updated }))}
              onOpenClassSelector={() => setIsClassModalOpen(true)}
              onOpenLanguageCenter={() => setIsLanguageModalOpen(true)}
              onNavigateToPhoto={() => setActiveTab('photo')}
            />
          )}

          {activeTab === 'focus-session' && (
            <StudyFocusView
              profile={profile}
              onNavigateToTutor={() => setActiveTab('tutor')}
              onNavigateToPractice={() => setActiveTab('practice')}
            />
          )}

          {activeTab === 'homework' && (
            <HomeworkView role="student" profile={profile} />
          )}

          {activeTab === 'my-progress' && (
            <MyProgressView
              profile={profile}
              onReviseTopic={(topic) => {
                setActiveSubject(topic);
                setActiveTab('tutor');
              }}
            />
          )}

          {activeTab === 'photo' && (
            <AskFromPhotoView profile={profile} activeSubject={activeSubject} />
          )}

          {activeTab === 'practice' && (
            <PracticeZoneView
              profile={profile}
              activeSubject={activeSubject}
              onUpdateXp={handleUpdateXp}
              onReviseTopic={(concept) => {
                setActiveSubject(concept);
                setActiveTab('tutor');
              }}
            />
          )}

          {activeTab === 'path' && (
            <LearningPathView
              profile={profile}
              activeSubject={activeSubject}
              onSelectTopic={(topic) => {
                setActiveSubject(topic);
                setActiveTab('tutor');
              }}
            />
          )}

          {activeTab === 'studio' && (
            <AIStudyStudioView profile={profile} activeSubject={activeSubject} />
          )}

          {activeTab === 'offline' && (
            <OfflineCentreView
              profile={profile}
              isSimulatedOffline={isSimulatedOffline}
              onToggleSimulateOffline={() => setIsSimulatedOffline(!isSimulatedOffline)}
            />
          )}

          {activeTab === 'career' && (
            <CareerExplorerView profile={profile} />
          )}

          {/* Teacher Portal Routes */}
          {activeTab === 'teacher' && (
            <TeacherModeView
              onNavigateToHomework={() => setActiveTab('teacher-homework')}
              onNavigateToReports={() => setActiveTab('teacher-reports')}
              onNavigateToCameraAlerts={() => setActiveTab('camera-alerts')}
              onNavigateToInsights={() => setActiveTab('teacher-insights')}
              onNavigateToActivity={() => setActiveTab('teacher-activity')}
            />
          )}

          {activeTab === 'teacher-homework' && (
            <HomeworkView role="teacher" profile={profile} />
          )}

          {activeTab === 'teacher-reports' && (
            <TeacherReportsView role="teacher" profile={profile} />
          )}

          {activeTab === 'camera-alerts' && (
            <CameraAlertsView />
          )}

          {activeTab === 'teacher-insights' && (
            <AILearningInsightsView
              profile={profile}
              onAssignRevision={() => setActiveTab('teacher-homework')}
            />
          )}

          {activeTab === 'teacher-activity' && (
            <DailyActivityView profile={profile} isTeacher={true} />
          )}

          {/* Parent Portal Routes */}
          {activeTab === 'parent' && (
            <ParentModeView
              profile={profile}
              onNavigateToReports={() => setActiveTab('parent-reports')}
              onNavigateToHomework={() => setActiveTab('parent-homework')}
            />
          )}

          {activeTab === 'parent-reports' && (
            <TeacherReportsView role="parent" profile={profile} />
          )}

          {activeTab === 'parent-homework' && (
            <HomeworkView role="parent" profile={profile} />
          )}
        </main>
      </div>

      {/* Global Modals */}
      {/* 1. Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* 2. Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        role={role}
        onClose={() => setIsNotificationDrawerOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* 3. Class Selector Modal (Strict Two-Class Limit) */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0C1E16]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <ClassSelector
            selectedClass={profile.classNum}
            assignedClasses={profile.assignedClasses || [10, 9]}
            selectedBoard={profile.schoolBoard}
            onSelectClass={(classNum) => setProfile((prev) => ({ ...prev, classNum }))}
            onSelectBoard={(schoolBoard) => setProfile((prev) => ({ ...prev, schoolBoard }))}
            onClose={() => setIsClassModalOpen(false)}
          />
        </div>
      )}

      {/* 4. Global Language Centre Modal */}
      {isLanguageModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0C1E16]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <LanguageCenter
            interfaceLanguage={profile.interfaceLanguage}
            tutorLanguage={profile.tutorLanguage}
            textbookLanguage={profile.textbookLanguage}
            onUpdateLanguages={handleUpdateLanguages}
            onClose={() => setIsLanguageModalOpen(false)}
          />
        </div>
      )}

      {/* 5. Accessibility & Preferences Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0C1E16]/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 border border-[#D5E9DC] max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D5E9DC] pb-3">
              <h3 className="font-bold text-[#18352A] text-base flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#006A4E]" />
                Accessibility & Learning Settings
              </h3>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-xs font-bold text-[#64776B] hover:text-[#18352A]"
              >
                Done
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F4FBF6] border border-[#D5E9DC]">
                <div>
                  <span className="font-bold text-[#18352A] block">High Contrast Mode</span>
                  <span className="text-[11px] text-[#64776B]">Enhance contrast in direct classroom sunlight</span>
                </div>
                <input
                  type="checkbox"
                  checked={profile.accessibility.highContrast}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      accessibility: { ...p.accessibility, highContrast: e.target.checked }
                    }))
                  }
                  className="w-4 h-4 rounded text-[#006A4E]"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F4FBF6] border border-[#D5E9DC]">
                <div>
                  <span className="font-bold text-[#18352A] block">Speech Read-Aloud Speed</span>
                  <span className="text-[11px] text-[#64776B]">Audio playback pacing</span>
                </div>
                <select
                  value={profile.accessibility.speechSpeed}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      accessibility: { ...p.accessibility, speechSpeed: parseFloat(e.target.value) }
                    }))
                  }
                  className="p-1.5 rounded-lg border border-[#D5E9DC] bg-white font-semibold text-[#18352A]"
                >
                  <option value={0.8}>0.8x (Slower)</option>
                  <option value={1.0}>1.0x (Normal)</option>
                  <option value={1.2}>1.2x (Faster)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F4FBF6] border border-[#D5E9DC]">
                <div>
                  <span className="font-bold text-[#18352A] block">Student Nickname</span>
                  <span className="text-[11px] text-[#64776B]">Friendly AI greetings</span>
                </div>
                <input
                  type="text"
                  value={profile.nickname}
                  onChange={(e) => setProfile((p) => ({ ...p, nickname: e.target.value }))}
                  className="p-1.5 rounded-lg border border-[#D5E9DC] text-xs w-28 text-center font-bold"
                />
              </div>
            </div>

            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#006A4E] hover:bg-[#004B38] text-white font-bold text-xs"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
