import React, { useEffect, useState } from 'react';
import { UserRole, User } from '../../types';
import { DEMO_USERS } from '../../data/mockStore';
import { INDIAN_LANGUAGES } from '../../data/languages';
import {
  GraduationCap,
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  Building,
  Languages,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  X
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register' | 'forgot';
  onClose: () => void;
  onSuccess: (user: User, role: UserRole) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);

  useEffect(() => {
    if (isOpen) setMode(initialMode);
  }, [isOpen, initialMode]);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [identifier, setIdentifier] = useState('subha@pathashala.edu');
  const [password, setPassword] = useState('password123');
  const [preferredLang, setPreferredLang] = useState('Odia');
  const [preferredSubject, setPreferredSubject] = useState('Mathematics');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSchool, setRegSchool] = useState('Bhubaneswar Government High School, Unit-1');
  const [regClasses, setRegClasses] = useState<number[]>([10]);
  const [regConsent, setRegConsent] = useState(false);

  // UI status
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleQuickFill = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    const demo = DEMO_USERS.find((u) => u.role === role);
    if (demo) {
      setIdentifier(demo.email);
      setPassword('password123');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, role: selectedRole })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`Welcome back, ${data.user.name}!`);
        setTimeout(() => {
          onSuccess(data.user, data.user.role);
          onClose();
        }, 600);
      } else {
        setErrorMessage(data.error || 'Invalid credentials. Check the identifier, password, and selected role.');
      }
    } catch (err) {
      setErrorMessage('Authentication service is unavailable. Check the backend connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (regPassword.length < 8) {
      setErrorMessage('Create a password with at least 8 characters.');
      return;
    }

    if (selectedRole === 'student') {
      if (regClasses.length === 0) {
        setErrorMessage('Please select at least 1 assigned class.');
        return;
      }
      if (regClasses.length > 2) {
        setErrorMessage(
          'You can access a maximum of two assigned classes. Please contact your teacher if you need to change your class assignment.'
        );
        return;
      }
      if (!regConsent) {
        setErrorMessage('Parent / Guardian consent confirmation is required to proceed.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          identifier: selectedRole === 'parent' ? '' : regStudentId,
          linkedStudentId: selectedRole === 'parent' ? regStudentId : undefined,
          school: regSchool,
          assignedClasses: regClasses,
          preferredLanguage: preferredLang,
          preferredSubject,
          role: selectedRole,
          password: regPassword
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) localStorage.setItem('pathashala_token', data.token);
        localStorage.setItem('pathashala_user', JSON.stringify(data.user));
        localStorage.setItem('pathashala_language', preferredLang);
        localStorage.setItem('pathashala_subject', preferredSubject);
        setSuccessMessage(selectedRole === 'parent' ? 'Parent account created. We will link the student account if the Student ID matches.' : selectedRole === 'teacher' ? 'Teacher account created successfully!' : 'Student account created successfully!');
        setTimeout(() => {
          onSuccess(data.user, selectedRole);
          onClose();
        }, 800);
      } else {
        setErrorMessage(data.error || 'Failed to register account.');
      }
    } catch (err) {
      setErrorMessage('Registration service is unavailable. Check the backend connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleClassSelection = (cls: number) => {
    if (regClasses.includes(cls)) {
      setRegClasses(regClasses.filter((c) => c !== cls));
    } else {
      if (regClasses.length >= 2) {
        setErrorMessage(
          'You can access a maximum of two assigned classes. Please contact your teacher if you need to change your class assignment.'
        );
        return;
      }
      setErrorMessage(null);
      setRegClasses([...regClasses, cls]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0C1E16]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl border border-[#D5E9DC] max-w-lg w-full shadow-2xl overflow-hidden my-8">
        {/* Top Header */}
        <div className="bg-[#004B38] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-2xl bg-[#006A4E] border border-white/20 flex items-center justify-center text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">PATHASHALA AI</h2>
              <p className="text-[10px] text-[#A5D9C2] font-semibold uppercase tracking-wider">
                One AI. Every Language. Every Learner.
              </p>
            </div>
          </div>

          <p className="text-xs text-[#DFF3E8] leading-relaxed">
            Secure, multilingual educational access for Indian school students, teachers, and guardians.
          </p>

          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-1.5 mt-5 p-1 bg-[#003627] rounded-xl text-xs font-bold">
            {(['student', 'teacher', 'parent'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setSelectedRole(r);
                  handleQuickFill(r);
                }}
                className={`py-2 rounded-lg capitalize transition flex items-center justify-center gap-1.5 ${
                  selectedRole === r
                    ? 'bg-[#006A4E] text-white shadow-xs'
                    : 'text-[#A5D9C2] hover:text-white'
                }`}
              >
                {r === 'student' && <GraduationCap className="w-3.5 h-3.5" />}
                {r === 'teacher' && <Building className="w-3.5 h-3.5" />}
                {r === 'parent' && <ShieldCheck className="w-3.5 h-3.5" />}
                <span>{r}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick-Fill Demo Bar */}
        <div className="bg-[#F4FBF6] px-6 py-2.5 border-b border-[#D5E9DC] flex items-center justify-between text-xs">
          <span className="text-[11px] font-bold text-[#64776B]">Quick Demo Logins:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('student')}
              className="px-2 py-0.5 rounded-md bg-white border border-[#D5E9DC] text-[#006A4E] hover:bg-[#DFF3E8] text-[10px] font-bold"
            >
              Subhashree (Student)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('teacher')}
              className="px-2 py-0.5 rounded-md bg-white border border-[#D5E9DC] text-[#006A4E] hover:bg-[#DFF3E8] text-[10px] font-bold"
            >
              Smt. Priya (Teacher)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('parent')}
              className="px-2 py-0.5 rounded-md bg-white border border-[#D5E9DC] text-[#006A4E] hover:bg-[#DFF3E8] text-[10px] font-bold"
            >
              Ananya (Parent)
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-[#DFF3E8] border border-[#D5E9DC] text-[#004B38] text-xs flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-[#006A4E]" />
              <span className="font-bold">{successMessage}</span>
            </div>
          )}

          {/* Mode 1: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#18352A] mb-1.5">
                  {selectedRole === 'student'
                    ? 'Student ID or Registered Email'
                    : selectedRole === 'teacher'
                    ? 'Teacher School Email / Employee ID'
                    : 'Registered Mobile or Email'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64776B] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      selectedRole === 'student' ? 'subha@pathashala.edu or BSE-2026-OD-8819' : 'user@school.edu'
                    }
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#D5E9DC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006A4E] bg-white text-[#18352A]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#18352A]">Password</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] font-bold text-[#006A4E] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64776B] absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[#D5E9DC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006A4E] bg-white text-[#18352A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#64776B] hover:text-[#18352A]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#18352A] mb-1.5 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-[#006A4E]" />
                  <span>Preferred Learning Language</span>
                </label>
                <select
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D5E9DC] text-xs font-bold bg-white text-[#18352A] focus:outline-none focus:ring-2 focus:ring-[#006A4E]"
                >
                  {INDIAN_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.name}>
                      {lang.name} ({lang.nativeName})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-[#006A4E] hover:bg-[#004B38] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <span>{isLoading ? 'Verifying Credentials...' : `Sign In to ${selectedRole.toUpperCase()} Portal`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2 border-t border-[#D5E9DC]">
                <p className="text-xs text-[#64776B]">
                  New student without an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMessage(null);
                    }}
                    className="font-bold text-[#006A4E] hover:underline"
                  >
                    Create Student Account
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Mode 2: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-[#18352A] mb-1">Full Student Name</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Subhashree Nayak"
                  className="w-full px-3 py-2 rounded-xl border border-[#D5E9DC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006A4E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#18352A] mb-1">Student Roll / ID</label>
                  <input
                    type="text"
                    value={regStudentId}
                    onChange={(e) => setRegStudentId(e.target.value)}
                    placeholder="BSE-2026-XXXX"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5E9DC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006A4E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#18352A] mb-1">School Email</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="student@school.edu"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5E9DC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006A4E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#18352A] mb-1">Create Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2 rounded-xl border border-[#D5E9DC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006A4E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#18352A] mb-1">School Name</label>
                <input
                  type="text"
                  value={regSchool}
                  onChange={(e) => setRegSchool(e.target.value)}
                  placeholder="Bhubaneswar Govt High School"
                  className="w-full px-3 py-2 rounded-xl border border-[#D5E9DC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006A4E]"
                />
              </div>

              {selectedRole === 'student' && (
                <div>
                  <label className="block text-xs font-bold text-[#18352A] mb-1">Main Subject to Study</label>
                  <select value={preferredSubject} onChange={(e) => setPreferredSubject(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-[#D5E9DC] text-xs font-bold bg-white text-[#18352A] focus:outline-none focus:ring-2 focus:ring-[#006A4E]">
                    {['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Odia', 'History', 'Geography', 'Computer Science'].map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                  </select>
                  <p className="mt-1 text-[10px] text-[#64776B]">You can change your main subject later from your Student Profile.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#18352A] mb-1.5 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-[#006A4E]" />
                  <span>Regional Language for the App and Tutor</span>
                </label>
                <select value={preferredLang} onChange={(e) => setPreferredLang(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-[#D5E9DC] text-xs font-bold bg-white text-[#18352A] focus:outline-none focus:ring-2 focus:ring-[#006A4E]">
                  {INDIAN_LANGUAGES.map((lang) => <option key={lang.id} value={lang.name}>{lang.name} ({lang.nativeName})</option>)}
                </select>
                <p className="mt-1 text-[10px] text-[#64776B]">Greetings and supported learning guidance will follow your chosen language.</p>
              </div>

              {/* Strict Two-Class Limit Selector */}
              <div className="p-3 rounded-2xl bg-[#F4FBF6] border border-[#D5E9DC] space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#18352A]">
                    Assigned Classes (Max 2 Allowed)
                  </label>
                  <span className="text-[10px] font-bold text-[#006A4E]">
                    {regClasses.length}/2 Selected
                  </span>
                </div>
                <p className="text-[10px] text-[#64776B]">
                  Each student may access up to two grades (e.g. current Grade 10 + Grade 9 revision).
                </p>
                <div className="grid grid-cols-6 gap-1 pt-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((cls) => {
                    const isSelected = regClasses.includes(cls);
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => toggleClassSelection(cls)}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                          isSelected
                            ? 'bg-[#006A4E] text-white border-[#004B38]'
                            : 'bg-white text-[#18352A] border-[#D5E9DC] hover:border-[#006A4E]'
                        }`}
                      >
                        Cl. {cls}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#DFF3E8]/40 border border-[#D5E9DC]">
                <input
                  type="checkbox"
                  id="consent"
                  checked={regConsent}
                  onChange={(e) => setRegConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#006A4E]"
                />
                <label htmlFor="consent" className="text-[11px] text-[#18352A] leading-tight">
                  <span className="font-bold">Parent & School Consent:</span> I confirm student registration under school authorization. AI educational features comply with NEP 2020 student privacy safeguards.
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-[#006A4E] hover:bg-[#004B38] text-white font-bold text-xs shadow-md transition"
              >
                {isLoading ? 'Creating Account...' : 'Complete Student Registration'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs font-bold text-[#006A4E] hover:underline"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </form>
          )}

          {/* Mode 3: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <div className="space-y-4 text-xs">
              <p className="text-[#64776B] leading-relaxed">
                For school student security, password resets are verified through your school administrator or registered guardian mobile OTP.
              </p>
              <div>
                <label className="block font-bold text-[#18352A] mb-1">Enter Student ID / Email</label>
                <input
                  type="text"
                  placeholder="e.g. subha@pathashala.edu"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D5E9DC] font-semibold text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSuccessMessage('Reset instructions sent to registered parent email.');
                  setTimeout(() => setMode('login'), 1500);
                }}
                className="w-full py-2.5 rounded-xl bg-[#006A4E] text-white font-bold"
              >
                Send Password Reset Link
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-bold text-[#006A4E] hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
