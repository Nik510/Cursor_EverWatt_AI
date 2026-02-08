/**
 * Study Guide Generator
 * Generates a downloadable PDF study guide from a certification test.
 */

import React from 'react';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import type { CertificationTest } from '../../../backend/ee-training/types';

export interface StudyGuideGeneratorProps {
  test: CertificationTest;
  filenamePrefix?: string;
}

function groupBy<T, K extends string>(items: T[], keyFn: (t: T) => K): Record<K, T[]> {
  return items.reduce((acc, it) => {
    const k = keyFn(it);
    (acc[k] ||= []).push(it);
    return acc;
  }, {} as Record<K, T[]>);
}

export const StudyGuideGenerator: React.FC<StudyGuideGeneratorProps> = ({
  test,
  filenamePrefix = 'EverWatt-Study-Guide',
}) => {
  const handleDownload = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });

    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;

    let y = margin;

    const addTitle = (t: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      const lines = doc.splitTextToSize(t, maxWidth);
      doc.text(lines, margin, y);
      y += lines.length * 24;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
    };

    const addH2 = (t: string) => {
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(t, margin, y);
      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
    };

    const addText = (t: string) => {
      const lines = doc.splitTextToSize(t, maxWidth);
      if (y + lines.length * 14 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(lines, margin, y);
      y += lines.length * 14;
    };

    addTitle(test.title);
    if (test.subtitle) addText(test.subtitle);
    y += 6;
    addText(test.description);
    y += 10;
    addText(`Passing score: ${test.passingScore}%${test.timeLimit ? ` · Time limit: ${test.timeLimit} minutes` : ''}`);
    addText(`Questions: ${test.questions.length}`);

    addH2('Key topics');
    const byCategory = groupBy(test.questions, (q) => q.category as string);
    Object.entries(byCategory)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([cat, qs]) => addText(`- ${cat}: ${qs.length} questions`));

    addH2('How to study (fast)');
    addText('- Start with the Industry-Specific Guide for your facility type.');
    addText('- Learn the big levers: HVAC, lighting, schedules/controls, and the dominant process loads for the industry.');
    addText('- Practice calculation questions: always write units and do quick sanity checks.');
    addText('- Use practice mode to learn from explanations; then take the timed test when ready.');

    addH2('Question bank (with answers)');
    test.questions.forEach((q, idx) => {
      if (y > pageHeight - margin - 120) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      addText(`${idx + 1}. [${q.category} · ${q.difficulty} · ${q.points} pts] ${q.question}`);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);

      if (q.scenario) addText(`Scenario: ${q.scenario}`);

      const correct = q.options.find((o) => o.id === q.correctAnswer)?.text ?? q.correctAnswer;
      addText(`Answer: ${correct}`);
      if (q.explanation) addText(`Explanation: ${q.explanation}`);
      y += 6;
    });

    const safeIndustry = (test.industry || 'industry').replace(/[^a-z0-9-_]+/gi, '-');
    const filename = `${filenamePrefix}-${safeIndustry}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-slate-50 via-indigo-50 to-pink-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-700" />
          <div className="font-extrabold text-slate-900">Study Guide</div>
        </div>
        <div className="text-sm text-slate-600 mt-1">Download a PDF guide generated from this certification test.</div>
      </div>
      <div className="p-6">
        <button
          type="button"
          onClick={handleDownload}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Study Guide (PDF)
        </button>
      </div>
    </div>
  );
};


