/**
 * Practice Test View
 * Wrapper around CertificationTestView with practiceMode enabled.
 */

import React from 'react';
import { GraduationCap } from 'lucide-react';
import type { CertificationAttempt, CertificationTest, PracticeAttempt } from '../../../backend/ee-training/types';
import { CertificationTestView } from './CertificationTestView';

const PRACTICE_KEY = 'everwatt_practice_attempts';

function savePracticeAttempt(attempt: PracticeAttempt) {
  try {
    const raw = localStorage.getItem(PRACTICE_KEY);
    const arr: PracticeAttempt[] = raw ? JSON.parse(raw) : [];
    arr.push(attempt);
    localStorage.setItem(PRACTICE_KEY, JSON.stringify(arr));
  } catch (e) {
    console.error('Error saving practice attempt:', e);
  }
}

export interface PracticeTestViewProps {
  test: CertificationTest;
  onComplete?: (attempt: PracticeAttempt) => void;
  onCancel?: () => void;
}

export const PracticeTestView: React.FC<PracticeTestViewProps> = ({ test, onComplete, onCancel }) => {
  const handleComplete = (attempt: CertificationAttempt) => {
    const practiceAttempt: PracticeAttempt = {
      id: `practice-${Date.now()}`,
      testId: attempt.testId,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      answers: attempt.answers,
      score: attempt.score,
      percentage: attempt.percentage,
      timeSpent: attempt.timeSpent,
    };
    savePracticeAttempt(practiceAttempt);
    onComplete?.(practiceAttempt);
  };

  return (
    <div className="relative">
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="px-4 py-2 rounded-full bg-white border border-slate-200 shadow-md text-sm font-semibold text-slate-700 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-indigo-600" />
          Practice mode: instant feedback, no timer
        </div>
      </div>
      <CertificationTestView test={test} onComplete={handleComplete} onCancel={onCancel} practiceMode />
    </div>
  );
};


