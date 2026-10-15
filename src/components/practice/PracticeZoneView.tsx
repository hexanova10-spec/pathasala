import React, { useEffect, useState } from 'react';
import { QuizQuestion, StudentProfile } from '../../types';
import { SAMPLE_QUIZZES } from '../../data/curriculum';
import { offlineStorage } from '../../services/offlineStorage';
import { CheckCircle2, XCircle, Award, HelpCircle, ArrowRight, RotateCcw, Sparkles, BookOpen, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

const shuffleQuestions = <T,>(items: T[]): T[] => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

interface PracticeZoneViewProps {
  profile: StudentProfile;
  activeSubject: string;
  onUpdateXp?: (points: number) => void;
  onReviseTopic?: (concept: string) => void;
}

export const PracticeZoneView: React.FC<PracticeZoneViewProps> = ({
  profile,
  activeSubject,
  onUpdateXp,
  onReviseTopic,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'All' | 'Beginner' | 'Easy' | 'Medium' | 'Advanced'>('All');
  const [practiceMode, setPracticeMode] = useState<'adaptive' | 'board_prep' | 'daily_challenge'>('adaptive');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionOrder, setQuestionOrder] = useState<QuizQuestion[]>(() => shuffleQuestions(SAMPLE_QUIZZES));
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionGenerationMessage, setQuestionGenerationMessage] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [mistakesList, setMistakesList] = useState<{ question: string; concept: string; explanation: string }[]>([]);

  // Filter questions by class/subject/difficulty
  const filteredQuestions = questionOrder.filter((q) => {
    if (selectedDifficulty !== 'All' && q.difficulty !== selectedDifficulty) return false;
    return true;
  });

  const activeQuestion = filteredQuestions[currentQuestionIndex] || questionOrder[0] || SAMPLE_QUIZZES[0];

  const generateFreshQuestions = async () => {
    setIsGeneratingQuestions(true);
    setQuestionGenerationMessage('');
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setMistakesList([]);
    try {
      const response = await fetch('/api/gemini/practice-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classNum: profile.classNum,
          subject: activeSubject,
          language: profile.tutorLanguage || profile.interfaceLanguage || 'English',
          mode: practiceMode,
          difficulty: selectedDifficulty,
          recentMistakes: mistakesList,
          refreshSeed: `${Date.now()}-${Math.random().toString(36).slice(2)}`
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(data.error || 'Personalized AI questions are unavailable right now.');
      }
      setQuestionOrder(shuffleQuestions(data.questions as QuizQuestion[]));
      setQuestionGenerationMessage('Fresh questions generated for your class, subject, and practice history.');
    } catch (error: any) {
      const matchingSamples = SAMPLE_QUIZZES.filter((q) =>
        q.classNum === profile.classNum && q.subject.toLowerCase().includes(activeSubject.toLowerCase().split(' ')[0])
      );
      setQuestionOrder(shuffleQuestions(matchingSamples.length ? matchingSamples : SAMPLE_QUIZZES));
      setQuestionGenerationMessage(`Live AI question generation is unavailable. Showing shuffled sample questions instead. ${error?.message || ''}`);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  useEffect(() => {
    void generateFreshQuestions();
    // Question generation intentionally resets when class, subject, mode, or difficulty changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubject, profile.classNum, practiceMode, selectedDifficulty]);

  const handleSelectOption = (index: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(index);
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || isAnswerSubmitted) return;
    setIsAnswerSubmitted(true);

    const isCorrect = selectedOption === activeQuestion.correctIndex;
    if (isCorrect) {
      setScore((prev) => prev + 1);
      if (onUpdateXp) onUpdateXp(25);
    } else {
      setMistakesList((prev) => [
        ...prev,
        {
          question: activeQuestion.question,
          concept: activeQuestion.concept,
          explanation: activeQuestion.explanation
        }
      ]);
    }

    // Queue offline action in IndexedDB
    try {
      await offlineStorage.queueAction({
        type: 'quiz_completed',
        payload: {
          questionId: activeQuestion.id,
          concept: activeQuestion.concept,
          isCorrect,
          classNum: profile.classNum,
          subject: activeSubject
        }
      });
    } catch (e) {
      console.warn('Queue action error:', e);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    if (currentQuestionIndex < filteredQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      void generateFreshQuestions();
    }
  };

  const isBoardExamClass = profile.classNum === 10 || profile.classNum === 12;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
              Adaptive Practice Zone
            </span>
            {isBoardExamClass && (
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Class {profile.classNum} Board Exam Focus
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            Smart Quiz & Conceptual Practice
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Class {profile.classNum} • {activeSubject} • {profile.schoolBoard}
          </p>
        </div>

        {/* Score & XP widget */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center min-w-[80px]">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Score</span>
            <span className="text-lg font-black text-indigo-600">{score}</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center min-w-[80px]">
            <span className="text-[10px] font-bold text-amber-700 uppercase block">Earned XP</span>
            <span className="text-lg font-black text-amber-600">+{score * 25}</span>
          </div>
        </div>
      </div>

      {/* Mode & Difficulty Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl font-semibold">
          <button
            onClick={() => setPracticeMode('adaptive')}
            className={`px-3 py-1.5 rounded-lg transition ${
              practiceMode === 'adaptive' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            Adaptive Quiz
          </button>
          <button
            onClick={() => setPracticeMode('daily_challenge')}
            className={`px-3 py-1.5 rounded-lg transition ${
              practiceMode === 'daily_challenge' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            Daily Challenge
          </button>
          {isBoardExamClass && (
            <button
              onClick={() => setPracticeMode('board_prep')}
              className={`px-3 py-1.5 rounded-lg transition ${
                practiceMode === 'board_prep' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Board Exam Bank
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="text-slate-400 font-medium mr-1">Difficulty:</span>
          {(['All', 'Beginner', 'Easy', 'Medium', 'Advanced'] as const).map((diff) => (
            <button
              key={diff}
              onClick={() => {
                setSelectedDifficulty(diff);
                setCurrentQuestionIndex(0);
                setIsAnswerSubmitted(false);
                setSelectedOption(null);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                selectedDifficulty === diff
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
        <div className="text-xs text-indigo-900" role="status">
          {isGeneratingQuestions ? 'Creating a fresh question set for your learning...' : questionGenerationMessage}
        </div>
        <button
          type="button"
          onClick={() => void generateFreshQuestions()}
          disabled={isGeneratingQuestions}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition"
        >
          {isGeneratingQuestions ? 'Generating…' : 'Generate New Questions'}
        </button>
      </div>

      {/* Active Question Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-indigo-600">
              Question {currentQuestionIndex + 1} of {filteredQuestions.length}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
              Concept: {activeQuestion.concept}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-bold border border-violet-200">
            {activeQuestion.difficulty}
          </span>
        </div>

        <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed">
          {isGeneratingQuestions ? 'Generating personalized questions for your class and subject…' : activeQuestion.question}
        </h2>

        {/* Options Grid */}
        <div className="space-y-3">
          {activeQuestion.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === activeQuestion.correctIndex;
            let btnStyle = 'bg-slate-50 border-slate-200 text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/30';

            if (isAnswerSubmitted) {
              if (isCorrect) {
                btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold';
              } else if (isSelected && !isCorrect) {
                btnStyle = 'bg-rose-50 border-rose-500 text-rose-900 font-semibold';
              } else {
                btnStyle = 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-60';
              }
            } else if (isSelected) {
              btnStyle = 'bg-indigo-50 border-indigo-600 text-indigo-900 font-semibold ring-2 ring-indigo-200';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(idx)}
                disabled={isAnswerSubmitted}
                className={`w-full p-4 rounded-2xl border text-left text-sm transition-all flex items-center justify-between ${btnStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-white border border-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{option}</span>
                </div>

                {isAnswerSubmitted && (
                  <div>
                    {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-600" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Evaluation and Explanation Card */}
        {isAnswerSubmitted && (
          <div
            className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-2 animate-fadeIn ${
              selectedOption === activeQuestion.correctIndex
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {selectedOption === activeQuestion.correctIndex ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Correct! Learning Goal Verified (+25 XP)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>Learning Gap Identified! Added to "Topics to Revise"</span>
                </>
              )}
            </div>

            <p className="leading-relaxed text-slate-700">
              <strong>Step-by-Step Pedagogical Explanation:</strong> {activeQuestion.explanation}
            </p>

            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Concept Tag: <strong>{activeQuestion.concept}</strong>
              </span>
              {onReviseTopic && (
                <button
                  onClick={() => onReviseTopic(activeQuestion.concept)}
                  className="font-bold text-indigo-700 hover:underline text-xs flex items-center gap-1"
                >
                  Revise with AI Tutor
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action Button Row */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-400">
            {activeQuestion.board || 'CBSE & Odisha BSE Aligned Practice'}
          </div>

          {!isAnswerSubmitted ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={isGeneratingQuestions || selectedOption === null}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm transition shadow-md shadow-indigo-600/20"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow"
            >
              <span>Next Question</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mistakes Review / Topics to Revise Section */}
      {mistakesList.length > 0 && (
        <div className="bg-amber-50/70 rounded-3xl p-6 border border-amber-200/80 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <h3 className="font-bold text-amber-900 text-sm">
              Topics to Revise ({mistakesList.length} Learning Gaps Noted)
            </h3>
          </div>
          <p className="text-xs text-amber-800">
            Our agent flags these areas so you can reinforce them before school exams without feeling discouraged:
          </p>
          <div className="space-y-2">
            {mistakesList.map((m, idx) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-amber-200 text-xs space-y-1">
                <span className="font-bold text-indigo-700">{m.concept}</span>
                <p className="text-slate-600">{m.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
