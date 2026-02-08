/**
 * Certification Test View
 * Full-screen test-taking interface for industry-specific certifications
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, Award, RotateCcw, ArrowLeft, ArrowRight } from 'lucide-react';
import type { CertificationTest, CertificationAttempt } from '../../../backend/ee-training/types';

export interface CertificationTestViewProps {
  test: CertificationTest;
  onComplete: (attempt: CertificationAttempt) => void;
  onCancel?: () => void;
  practiceMode?: boolean;
  onViewCertificate?: () => void;
}

export const CertificationTestView: React.FC<CertificationTestViewProps> = ({
  test,
  onComplete,
  onCancel,
  practiceMode = false,
  onViewCertificate,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [showReview, setShowReview] = useState(false);

  // Initialize timer if time limit exists
  useEffect(() => {
    if (!practiceMode && test.timeLimit) {
      const totalSeconds = test.timeLimit * 60;
      setTimeRemaining(totalSeconds);

      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [test.timeLimit, practiceMode]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (questionId: string, answerId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerId }));
  };

  const handleNext = () => {
    if (currentIndex < test.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleAutoSubmit = () => {
    if (!isComplete) {
      submitTest();
    }
  };

  const submitTest = useCallback(() => {
    if (isComplete) return;

    const endTime = new Date();
    const timeSpent = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    // Calculate score
    let totalPoints = 0;
    let earnedPoints = 0;

    test.questions.forEach((question) => {
      totalPoints += question.points;
      if (answers[question.id] === question.correctAnswer) {
        earnedPoints += question.points;
      }
    });

    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = percentage >= test.passingScore;

    const attempt: CertificationAttempt = {
      id: `attempt-${Date.now()}`,
      testId: test.id,
      startedAt: startTime.toISOString(),
      completedAt: endTime.toISOString(),
      answers,
      score: earnedPoints,
      percentage,
      passed,
      timeSpent,
    };

    setIsComplete(true);
    setShowReview(true);
    onComplete(attempt);
  }, [answers, test, startTime, isComplete, onComplete]);

  const currentQuestion = test.questions[currentIndex];
  const hasAnswer = answers[currentQuestion.id] !== undefined;
  const answeredCount = Object.keys(answers).length;
  const progress = ((currentIndex + 1) / test.questions.length) * 100;

  // Results screen
  if (showReview && isComplete) {
    // Recalculate for display
    let totalPoints = 0;
    let earnedPoints = 0;
    test.questions.forEach((q) => {
      totalPoints += q.points;
      if (answers[q.id] === q.correctAnswer) {
        earnedPoints += q.points;
      }
    });
    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = percentage >= test.passingScore;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Header */}
            <div
              className={[
                'p-8 text-white text-center',
                practiceMode
                  ? 'bg-gradient-to-r from-indigo-600 to-pink-600'
                  : passed
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                    : 'bg-gradient-to-r from-red-600 to-orange-600',
              ].join(' ')}
            >
              <div className="text-6xl mb-4">{practiceMode ? '🧠' : passed ? '🎉' : '📚'}</div>
              <h2 className="text-3xl font-bold mb-2">
                {practiceMode ? 'Practice Complete' : passed ? 'Congratulations!' : 'Keep Learning'}
              </h2>
              <p className="text-white/90 text-lg">
                {practiceMode
                  ? `You scored ${percentage}%. Review explanations below and retry as needed.`
                  : passed
                    ? `You passed with ${percentage}%! You've earned your certification.`
                    : `You scored ${percentage}%. You need ${test.passingScore}% to pass.`}
              </p>
            </div>

            {/* Score Breakdown */}
            <div className="p-8">
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="text-center p-6 bg-slate-50 rounded-xl">
                  <div className="text-4xl font-bold text-slate-900">{earnedPoints}</div>
                  <div className="text-sm text-slate-600 mt-1">Points Earned</div>
                  <div className="text-xs text-slate-500 mt-1">of {totalPoints} total</div>
                </div>
                <div className="text-center p-6 bg-slate-50 rounded-xl">
                  <div className="text-4xl font-bold text-slate-900">{percentage}%</div>
                  <div className="text-sm text-slate-600 mt-1">Score</div>
                  <div className="text-xs text-slate-500 mt-1">Required: {test.passingScore}%</div>
                </div>
                <div className="text-center p-6 bg-slate-50 rounded-xl">
                  <div className="text-4xl font-bold text-slate-900">
                    {test.questions.filter((q) => answers[q.id] === q.correctAnswer).length}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">Correct</div>
                  <div className="text-xs text-slate-500 mt-1">of {test.questions.length} questions</div>
                </div>
              </div>

              {/* Question Review */}
              <div className="space-y-4 mb-8">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Question Review</h3>
                {test.questions.map((question, index) => {
                  const userAnswer = answers[question.id];
                  const isCorrect = userAnswer === question.correctAnswer;
                  const selectedOption = question.options.find((opt) => opt.id === userAnswer);
                  const correctOption = question.options.find((opt) => opt.id === question.correctAnswer);

                  return (
                    <div
                      key={question.id}
                      className={`p-6 rounded-xl border-2 ${
                        isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-4 mb-3">
                        {isCorrect ? (
                          <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-slate-900">Question {index + 1}</span>
                            <span className="text-xs px-2 py-1 bg-slate-200 rounded-full text-slate-700">
                              {question.category}
                            </span>
                            <span className="text-xs px-2 py-1 bg-slate-200 rounded-full text-slate-700">
                              {question.difficulty}
                            </span>
                            <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                              {question.points} pts
                            </span>
                          </div>
                          <p className="font-medium text-slate-900 mb-2">{question.question}</p>
                          {question.scenario && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                              <p className="text-sm text-blue-900">
                                <strong>Scenario:</strong> {question.scenario}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="ml-10 space-y-2">
                        {selectedOption && (
                          <div className={`p-3 rounded-lg ${
                            isCorrect ? 'bg-emerald-100 border border-emerald-300' : 'bg-red-100 border border-red-300'
                          }`}>
                            <div className="text-sm font-semibold mb-1">
                              {isCorrect ? '✓ Your Answer (Correct)' : '✗ Your Answer'}
                            </div>
                            <div className="text-sm text-slate-700">{selectedOption.text}</div>
                          </div>
                        )}
                        {!isCorrect && correctOption && (
                          <div className="p-3 rounded-lg bg-emerald-100 border border-emerald-300">
                            <div className="text-sm font-semibold mb-1">✓ Correct Answer</div>
                            <div className="text-sm text-slate-700">{correctOption.text}</div>
                          </div>
                        )}
                        {question.explanation && (
                          <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 mt-2">
                            <div className="text-sm font-semibold mb-1 text-slate-700">Explanation</div>
                            <div className="text-sm text-slate-600">{question.explanation}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                {!practiceMode && passed && (
                  <button
                    onClick={() => {
                      onViewCertificate?.();
                    }}
                    className="flex-1 py-4 px-6 bg-gradient-to-r from-indigo-600 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <Award className="w-5 h-5" />
                    View Certificate
                  </button>
                )}
                {(practiceMode || !passed) && (
                  <button
                    onClick={() => {
                      setShowReview(false);
                      setIsComplete(false);
                      setCurrentIndex(0);
                      setAnswers({});
                      setStartTime(new Date());
                      if (!practiceMode && test.timeLimit) {
                        setTimeRemaining(test.timeLimit * 60);
                      }
                    }}
                    className="flex-1 py-4 px-6 bg-slate-600 text-white rounded-xl font-semibold hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    {practiceMode ? 'Practice Again' : 'Retake Test'}
                  </button>
                )}
                {onCancel && (
                  <button
                    onClick={onCancel}
                    className="px-6 py-4 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-all"
                  >
                    Back
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Test-taking screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-50 flex flex-col">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{test.title}</h1>
            <p className="text-sm text-slate-600">Question {currentIndex + 1} of {test.questions.length}</p>
          </div>
          <div className="flex items-center gap-6">
            {!practiceMode && timeRemaining !== null && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
              </div>
            )}
            <div className="text-sm text-slate-600">
              {answeredCount} / {test.questions.length} answered
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Exit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-slate-200">
        <div
          className="h-full bg-gradient-to-r from-indigo-600 to-pink-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            {/* Question Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-pink-600 p-6 text-white">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                  {currentQuestion.category}
                </span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                  {currentQuestion.difficulty}
                </span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                  {currentQuestion.points} points
                </span>
                {currentQuestion.questionType !== 'multiple-choice' && (
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                    {currentQuestion.questionType}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold">{currentQuestion.question}</h2>
            </div>

            {/* Scenario (if applicable) */}
            {currentQuestion.scenario && (
              <div className="p-6 bg-blue-50 border-b border-blue-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-blue-900 mb-1">Scenario</div>
                    <p className="text-blue-800">{currentQuestion.scenario}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="p-6">
              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const isSelected = answers[currentQuestion.id] === option.id;
                  const hasAnswered = answers[currentQuestion.id] !== undefined;
                  const isCorrect = option.id === currentQuestion.correctAnswer;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleAnswerSelect(currentQuestion.id, option.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900'
                          : practiceMode && hasAnswered && isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-slate-50 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300'
                        }`}>
                          {isSelected && <CheckCircle className="w-4 h-4" />}
                        </div>
                        <span className="font-medium">{option.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {practiceMode && answers[currentQuestion.id] !== undefined && (
                <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="text-sm font-semibold text-slate-900">
                    {answers[currentQuestion.id] === currentQuestion.correctAnswer ? (
                      <span className="text-emerald-700">Correct</span>
                    ) : (
                      <span className="text-red-700">Not quite</span>
                    )}
                  </div>
                  {answers[currentQuestion.id] !== currentQuestion.correctAnswer && (
                    <div className="text-sm text-slate-700 mt-1">
                      Correct answer:{' '}
                      <span className="font-semibold">
                        {currentQuestion.options.find((o) => o.id === currentQuestion.correctAnswer)?.text ?? '—'}
                      </span>
                    </div>
                  )}
                  {currentQuestion.explanation && (
                    <div className="text-sm text-slate-600 mt-2">{currentQuestion.explanation}</div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="text-sm text-slate-600">
                {currentIndex + 1} of {test.questions.length}
              </div>

              {currentIndex < test.questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={submitTest}
                  disabled={!hasAnswer}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-pink-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center gap-2 font-semibold"
                >
                  <Award className="w-4 h-4" />
                  Submit Test
                </button>
              )}
            </div>
          </div>

          {/* Question Navigation Grid */}
          <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
            <div className="text-sm font-semibold text-slate-700 mb-4">Question Navigation</div>
            <div className="grid grid-cols-10 gap-2">
              {test.questions.map((q, index) => {
                const isAnswered = answers[q.id] !== undefined;
                const isCurrent = index === currentIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`aspect-square rounded-lg border-2 flex items-center justify-center text-sm font-semibold transition-all ${
                      isCurrent
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : isAnswered
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                        : 'bg-slate-100 border-slate-300 text-slate-600 hover:border-indigo-300'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

