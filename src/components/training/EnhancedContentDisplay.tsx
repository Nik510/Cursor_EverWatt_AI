import React, { useState } from 'react';
import { ChevronDown, ChevronUp, GraduationCap, Briefcase, Lightbulb, AlertTriangle, DollarSign, Code2 } from 'lucide-react';
import { PerspectiveBadge } from './PerspectiveBadge';

interface EnhancedContentDisplayProps {
  engineerPerspective?: {
    title: string;
    sections: {
      section: string;
      technicalExplanation: string;
      formulas?: { name: string; formula: string; explanation: string }[];
      references?: string[];
    }[];
  };
  salesPerspective?: {
    title: string;
    sections: {
      section: string;
      salesPitch: string;
      tradeSecrets: string[];
      commonObjections: { objection: string; response: string }[];
      realWorldExamples: { scenario: string; solution: string; savings: string }[];
    }[];
  };
  deepDive?: {
    concept: string;
    engineerExplanation: string;
    salesExplanation: string;
    fieldTips: string[];
    commonMistakes: string[];
  }[];
}

export const EnhancedContentDisplay: React.FC<EnhancedContentDisplayProps> = ({
  engineerPerspective,
  salesPerspective,
  deepDive
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="space-y-8">
      {/* Engineer Perspective */}
      {engineerPerspective && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-600 rounded-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{engineerPerspective.title}</h2>
              <p className="text-sm text-gray-600">Technical deep dive with formulas and engineering principles</p>
            </div>
          </div>

          <div className="space-y-6">
            {engineerPerspective.sections.map((section, idx) => {
              const sectionId = `engineer-${idx}`;
              const isExpanded = expandedSections.has(sectionId);
              
              return (
                <div key={idx} className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                  <button
                    onClick={() => toggleSection(sectionId)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <PerspectiveBadge type="engineer" />
                      <h3 className="text-lg font-semibold text-gray-900">{section.section}</h3>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-4 border-t border-blue-100">
                      {/* Technical Explanation */}
                      <div className="prose prose-sm max-w-none mb-6">
                        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                          {section.technicalExplanation}
                        </div>
                      </div>

                      {/* Formulas */}
                      {section.formulas && section.formulas.length > 0 && (
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <Code2 className="w-5 h-5 text-blue-600" />
                            <h4 className="font-semibold text-gray-900">Key Formulas</h4>
                          </div>
                          <div className="space-y-3">
                            {section.formulas.map((formula, fIdx) => (
                              <div key={fIdx} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-semibold text-gray-900">{formula.name}</h5>
                                </div>
                                <div className="bg-white border border-slate-300 rounded p-3 mb-2 font-mono text-sm text-gray-800">
                                  {formula.formula}
                                </div>
                                <p className="text-sm text-gray-600">{formula.explanation}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* References */}
                      {section.references && section.references.length > 0 && (
                        <div className="border-t border-blue-100 pt-4">
                          <h4 className="font-semibold text-gray-900 mb-2 text-sm">References</h4>
                          <ul className="space-y-1">
                            {section.references.map((ref, rIdx) => (
                              <li key={rIdx} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-blue-600 mt-1">•</span>
                                <span>{ref}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sales Perspective */}
      {salesPerspective && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-600 rounded-lg">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{salesPerspective.title}</h2>
              <p className="text-sm text-gray-600">Sales scripts, trade secrets, and objection handling</p>
            </div>
          </div>

          <div className="space-y-6">
            {salesPerspective.sections.map((section, idx) => {
              const sectionId = `sales-${idx}`;
              const isExpanded = expandedSections.has(sectionId);
              
              return (
                <div key={idx} className="bg-white rounded-lg border border-green-200 overflow-hidden">
                  <button
                    onClick={() => toggleSection(sectionId)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-green-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <PerspectiveBadge type="sales" />
                      <h3 className="text-lg font-semibold text-gray-900">{section.section}</h3>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-4 border-t border-green-100 space-y-6">
                      {/* Sales Pitch */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <h4 className="font-semibold text-gray-900">Sales Pitch</h4>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
                            {section.salesPitch}
                          </div>
                        </div>
                      </div>

                      {/* Trade Secrets */}
                      {section.tradeSecrets && section.tradeSecrets.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Lightbulb className="w-5 h-5 text-yellow-600" />
                            <h4 className="font-semibold text-gray-900">Trade Secrets</h4>
                          </div>
                          <div className="space-y-2">
                            {section.tradeSecrets.map((secret, sIdx) => (
                              <div key={sIdx} className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                                <p className="text-sm text-gray-700">{secret}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Common Objections */}
                      {section.commonObjections && section.commonObjections.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            <h4 className="font-semibold text-gray-900">Common Objections & Responses</h4>
                          </div>
                          <div className="space-y-4">
                            {section.commonObjections.map((obj, oIdx) => (
                              <div key={oIdx} className="border border-orange-200 rounded-lg overflow-hidden">
                                <div className="bg-orange-50 px-4 py-2 border-b border-orange-200">
                                  <p className="text-sm font-semibold text-orange-900">Objection:</p>
                                  <p className="text-sm text-orange-800 italic">"{obj.objection}"</p>
                                </div>
                                <div className="bg-white px-4 py-3">
                                  <p className="text-sm font-semibold text-gray-900 mb-1">Response:</p>
                                  <p className="text-sm text-gray-700">{obj.response}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Real World Examples */}
                      {section.realWorldExamples && section.realWorldExamples.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <h4 className="font-semibold text-gray-900">Real-World Examples</h4>
                          </div>
                          <div className="space-y-4">
                            {section.realWorldExamples.map((example, eIdx) => (
                              <div key={eIdx} className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <p className="font-semibold text-gray-900 mb-1">Scenario:</p>
                                    <p className="text-gray-700">{example.scenario}</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900 mb-1">Solution:</p>
                                    <p className="text-gray-700">{example.solution}</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-green-700 mb-1">Savings:</p>
                                    <p className="text-green-600 font-bold">{example.savings}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deep Dive Concepts */}
      {deepDive && deepDive.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Deep Dive Concepts</h2>
              <p className="text-sm text-gray-600">Detailed explanations with both engineering and sales perspectives</p>
            </div>
          </div>

          <div className="space-y-6">
            {deepDive.map((concept, idx) => {
              const conceptId = `deepdive-${idx}`;
              const isExpanded = expandedSections.has(conceptId);
              
              return (
                <div key={idx} className="bg-white rounded-lg border border-purple-200 overflow-hidden">
                  <button
                    onClick={() => toggleSection(conceptId)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-purple-50 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">{concept.concept}</h3>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-4 border-t border-purple-100 space-y-6">
                      {/* Engineer Explanation */}
                      <div>
                        <PerspectiveBadge type="engineer" className="mb-3" />
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
                            {concept.engineerExplanation}
                          </div>
                        </div>
                      </div>

                      {/* Sales Explanation */}
                      <div>
                        <PerspectiveBadge type="sales" className="mb-3" />
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
                            {concept.salesExplanation}
                          </div>
                        </div>
                      </div>

                      {/* Field Tips */}
                      {concept.fieldTips && concept.fieldTips.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-yellow-600" />
                            Field Tips
                          </h4>
                          <ul className="space-y-2">
                            {concept.fieldTips.map((tip, tIdx) => (
                              <li key={tIdx} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="text-yellow-600 mt-1">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Common Mistakes */}
                      {concept.commonMistakes && concept.commonMistakes.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            Common Mistakes to Avoid
                          </h4>
                          <ul className="space-y-2">
                            {concept.commonMistakes.map((mistake, mIdx) => (
                              <li key={mIdx} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="text-red-600 mt-1">✗</span>
                                <span>{mistake}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

