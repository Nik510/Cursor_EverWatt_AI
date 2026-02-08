/**
 * QuizWidget
 * Interactive quiz with immediate feedback and gamification
 */

import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  ArrowRight, 
  RotateCcw,
  Award,
  Lightbulb,
  Star
} from 'lucide-react';

export interface QuizQuestion {
  id: string;
  question: string;
  options: {
    id: string;
    text: string;
  }[];
  correctAnswer: string;
  explanation?: string;
  hint?: string;
  points?: number;
}

export interface QuizWidgetProps {
  questions: QuizQuestion[];
  title?: string;
  subtitle?: string;
  onComplete?: (score: number, totalPoints: number) => void;
  showHints?: boolean;
  allowRetry?: boolean;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  className?: string;
}

const colorConfig = {
  blue: {
    primary: 'bg-blue-600',
    secondary: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200',
    gradient: 'from-blue-500 to-indigo-600',
  },
  green: {
    primary: 'bg-emerald-600',
    secondary: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-200',
    gradient: 'from-emerald-500 to-teal-600',
  },
  purple: {
    primary: 'bg-purple-600',
    secondary: 'bg-purple-100 text-purple-700',
    border: 'border-purple-200',
    gradient: 'from-purple-500 to-pink-600',
  },
  orange: {
    primary: 'bg-orange-600',
    secondary: 'bg-orange-100 text-orange-700',
    border: 'border-orange-200',
    gradient: 'from-orange-500 to-red-600',
  },
};

export const QuizWidget: React.FC<QuizWidgetProps> = ({
  questions,
  title = 'Knowledge Check',
  subtitle,
  onComplete,
  showHints = true,
  allowRetry = true,
  color = 'blue',
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [answers, setAnswers] = useState<Record<string, { selected: string; correct: boolean }>>({});
  
  const colors = colorConfig[color];
  const currentQuestion = questions[currentIndex];
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
  
  const handleAnswerSelect = (answerId: string) => {
    if (showResult) return;
    setSelectedAnswer(answerId);
    setShowHint(false);
  };
  
  const handleSubmit = () => {
    if (!selectedAnswer) return;
    
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const points = isCorrect ? (currentQuestion.points || 1) : 0;
    
    setScore(prev => prev + points);
    setShowResult(true);
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: { selected: selectedAnswer, correct: isCorrect }
    }));
  };
  
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowHint(false);
    } else {
      setIsComplete(true);
      onComplete?.(score, totalPoints);
    }
  };
  
  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setShowHint(false);
    setScore(0);
    setIsComplete(false);
    setAnswers({});
  };
  
  const getScoreGrade = () => {
    const percentage = (score / totalPoints) * 100;
    if (percentage >= 90) return { label: 'Excellent!', emoji: '🏆', color: 'text-amber-500' };
    if (percentage >= 70) return { label: 'Great Job!', emoji: '⭐', color: 'text-emerald-500' };
    if (percentage >= 50) return { label: 'Good Effort!', emoji: '👍', color: 'text-blue-500' };
    return { label: 'Keep Learning!', emoji: '📚', color: 'text-purple-500' };
  };
  
  // Completion screen
  if (isComplete) {
    const grade = getScoreGrade();
    const percentage = Math.round((score / totalPoints) * 100);
    
    return (
      <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg ${className}`}>
        <div className={`bg-gradient-to-r ${colors.gradient} p-6 text-white text-center`}>
          <div className="text-6xl mb-3">{grade.emoji}</div>
          <h3 className="text-2xl font-bold">{grade.label}</h3>
          <p className="text-white/80 mt-1">You've completed the quiz</p>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-center gap-8 mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">{score}</div>
              <div className="text-sm text-gray-500">Points Earned</div>
            </div>
            <div className="w-px h-12 bg-gray-200" />
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">{percentage}%</div>
              <div className="text-sm text-gray-500">Score</div>
            </div>
            <div className="w-px h-12 bg-gray-200" />
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {Object.values(answers).filter(a => a.correct).length}/{questions.length}
              </div>
              <div className="text-sm text-gray-500">Correct</div>
            </div>
          </div>
          
          {/* Answer summary */}
          <div className="space-y-2 mb-6">
            {questions.map((q, i) => {
              const answer = answers[q.id];
              return (
                <div key={q.id} className={`flex items-center gap-3 p-3 rounded-lg ${
                  answer?.correct ? 'bg-emerald-50' : 'bg-red-50'
                }`}>
                  {answer?.correct ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-sm text-gray-700 flex-1 line-clamp-1">
                    {i + 1}. {q.question}
                  </span>
                  <span className="text-sm font-semibold">
                    {answer?.correct ? `+${q.points || 1}` : '0'}
                  </span>
                </div>
              );
            })}
          </div>
          
          {allowRetry && (
            <button
              onClick={handleRetry}
              className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }
  
  // Quiz question screen
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg ${className}`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${colors.gradient} p-5 text-white`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            <span className="font-semibold">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-300" />
            <span className="font-bold">{score} pts</span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-white/80 mt-2">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{currentQuestion.points || 1} points</span>
        </div>
      </div>
      
      {/* Question */}
      <div className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          {currentQuestion.question}
        </h4>
        
        {/* Hint */}
        {showHints && currentQuestion.hint && !showResult && (
          <button
            onClick={() => setShowHint(!showHint)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-4"
          >
            <Lightbulb className="w-4 h-4" />
            {showHint ? 'Hide hint' : 'Show hint'}
          </button>
        )}
        
        {showHint && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">{currentQuestion.hint}</p>
          </div>
        )}
        
        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedAnswer === option.id;
            const isCorrect = option.id === currentQuestion.correctAnswer;
            
            let optionClass = 'bg-gray-50 border-gray-200 hover:border-gray-300';
            
            if (showResult) {
              if (isCorrect) {
                optionClass = 'bg-emerald-50 border-emerald-500 text-emerald-700';
              } else if (isSelected && !isCorrect) {
                optionClass = 'bg-red-50 border-red-500 text-red-700';
              }
            } else if (isSelected) {
              optionClass = `${colors.secondary} ${colors.border}`;
            }
            
            return (
              <button
                key={option.id}
                onClick={() => handleAnswerSelect(option.id)}
                disabled={showResult}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${optionClass} ${
                  !showResult ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    showResult && isCorrect ? 'bg-emerald-500 border-emerald-500' :
                    showResult && isSelected && !isCorrect ? 'bg-red-500 border-red-500' :
                    isSelected ? `${colors.primary} border-current` :
                    'border-gray-300'
                  }`}>
                    {showResult && isCorrect && <CheckCircle className="w-4 h-4 text-white" />}
                    {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-white" />}
                  </div>
                  <span className="font-medium">{option.text}</span>
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Explanation */}
        {showResult && currentQuestion.explanation && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-1">Explanation</p>
            <p className="text-sm text-gray-600">{currentQuestion.explanation}</p>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="mt-6">
          {!showResult ? (
            <button
              onClick={handleSubmit}
              disabled={!selectedAnswer}
              className={`w-full py-3 px-4 ${colors.primary} text-white rounded-xl font-semibold transition-all ${
                selectedAnswer ? 'hover:opacity-90' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className={`w-full py-3 px-4 bg-gradient-to-r ${colors.gradient} text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2`}
            >
              {currentIndex < questions.length - 1 ? (
                <>
                  Next Question
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  See Results
                  <Award className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizWidget;
