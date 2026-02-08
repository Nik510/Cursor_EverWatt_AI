/**
 * Flash Card Widget
 * Lightweight flash cards for key concepts and certification prep.
 */

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Shuffle } from 'lucide-react';

export type FlashCard = {
  id: string;
  front: string;
  back: string;
  category?: string;
};

export interface FlashCardWidgetProps {
  cards: FlashCard[];
  title?: string;
  subtitle?: string;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const FlashCardWidget: React.FC<FlashCardWidgetProps> = ({ cards, title, subtitle }) => {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);

  const deck = useMemo(() => (shuffled ? shuffleArray(cards) : cards), [cards, shuffled]);
  const current = deck[index] ?? null;

  const reset = () => {
    setIndex(0);
    setFlipped(false);
  };

  if (!current) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-slate-600">
        No flash cards available.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-slate-50 via-indigo-50 to-pink-50 border-b border-slate-200">
        <div className="font-extrabold text-slate-900">{title ?? 'Flash Cards'}</div>
        {subtitle ? <div className="text-sm text-slate-600 mt-1">{subtitle}</div> : null}
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="text-xs font-semibold text-slate-600">
            Card {index + 1} of {deck.length}
            {current.category ? <span className="ml-2 px-2 py-1 rounded-full bg-slate-100 border border-slate-200">{current.category}</span> : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShuffled((v) => !v);
                reset();
              }}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4 text-slate-700" />
            </button>
            <button
              type="button"
              onClick={reset}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
              title="Reset"
            >
              <RefreshCw className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFlipped((v) => !v)}
          className="w-full text-left"
        >
          <div
            className={[
              'rounded-2xl border border-slate-200 bg-white shadow-sm p-6 min-h-[200px] transition-colors',
              flipped ? 'bg-emerald-50' : 'bg-white',
            ].join(' ')}
          >
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              {flipped ? 'Answer' : 'Prompt'}
            </div>
            <div className="mt-3 text-lg font-semibold text-slate-900 whitespace-pre-wrap">
              {flipped ? current.back : current.front}
            </div>
            <div className="mt-6 text-xs text-slate-500">
              Click to flip
            </div>
          </div>
        </button>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setIndex((i) => Math.max(0, i - 1));
              setFlipped(false);
            }}
            disabled={index === 0}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          <button
            type="button"
            onClick={() => {
              setIndex((i) => Math.min(deck.length - 1, i + 1));
              setFlipped(false);
            }}
            disabled={index === deck.length - 1}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};


