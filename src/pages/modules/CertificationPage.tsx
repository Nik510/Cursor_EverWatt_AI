/**
 * Certification Page
 * Main page for viewing and taking certification tests
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Award, Clock, BookOpen, CheckCircle, GraduationCap, FileText, Layers } from 'lucide-react';
import { fetchAllCertifications, fetchCertification, fetchCertificationByIndustry } from '../../api/ee-training';
import type { CertificationTest, CertificationAttempt } from '../../backend/ee-training/types';
import { CertificationTestView } from '../../components/ee-training/certification/CertificationTestView';
import { CertificateGenerator } from '../../components/ee-training/certification/CertificateGenerator';
import { PracticeTestView } from '../../components/ee-training/certification/PracticeTestView';
import { StudyGuideGenerator } from '../../components/ee-training/certification/StudyGuideGenerator';
import { FlashCardWidget } from '../../components/ee-training/certification/FlashCardWidget';
import { saveCertificationAttempt, saveCertificate, hasPassedTest, getCertificateForTest } from '../../utils/certification-storage';
import type { CertificationCertificate } from '../../backend/ee-training/types';

export const CertificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [certifications, setCertifications] = useState<CertificationTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<CertificationTest | null>(null);
  const [testResult, setTestResult] = useState<{ attempt: CertificationAttempt; test: CertificationTest } | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'cert' | 'practice' | 'tools' | 'certificate'>('list');

  const testId = searchParams.get('testId');
  const industry = searchParams.get('industry');
  const showCertificate = searchParams.get('certificate') === 'true';

  useEffect(() => {
    loadCertifications();
  }, []);

  useEffect(() => {
    if (testId) {
      loadTest(testId);
    } else if (industry) {
      loadTestByIndustry(industry);
    }
  }, [testId, industry, showCertificate]);

  const loadCertifications = async () => {
    try {
      setLoading(true);
      const certs = await fetchAllCertifications();
      setCertifications(certs);
    } catch (error) {
      console.error('Error loading certifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTest = async (id: string) => {
    try {
      const test = await fetchCertification(id);
      if (test) {
        setSelectedTest(test);
        if (showCertificate) {
          // Load certificate view - get saved certificate
          const certData = getCertificateForTest(id);
          if (certData) {
            setTestResult({
              attempt: {
                id: certData.attemptId,
                testId: id,
                startedAt: certData.issuedAt,
                completedAt: certData.issuedAt,
                answers: {},
                score: 0,
                percentage: 100,
                passed: true,
              },
              test,
            });
            setView('certificate');
          }
        } else {
          setView('cert');
        }
      }
    } catch (error) {
      console.error('Error loading test:', error);
    }
  };

  const loadTestByIndustry = async (ind: string) => {
    try {
      const test = await fetchCertificationByIndustry(ind);
      if (test) {
        setSelectedTest(test);
        setView('cert');
      }
    } catch (error) {
      console.error('Error loading test by industry:', error);
    }
  };

  const handleStartTest = (test: CertificationTest) => {
    setSelectedTest(test);
    setView('cert');
  };

  const handleTestComplete = (attempt: CertificationAttempt) => {
    if (selectedTest) {
      // Save attempt
      saveCertificationAttempt(attempt);
      
      // If passed, create and save certificate
      if (attempt.passed) {
        const certificate: CertificationCertificate = {
          id: `cert-${Date.now()}`,
          testId: selectedTest.id,
          industry: selectedTest.industry,
          title: selectedTest.title,
          issuedAt: attempt.completedAt || new Date().toISOString(),
          attemptId: attempt.id,
          certificateNumber: `EW-${new Date().getFullYear()}-${selectedTest.industry.toUpperCase().slice(0, 3)}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        };
        saveCertificate(certificate);
      }
      
      setTestResult({ attempt, test: selectedTest });
      // Keep view in test UI; user can review answers and choose to view certificate.
    }
  };

  const handleCancelTest = () => {
    setSelectedTest(null);
    setTestResult(null);
    setView('list');
  };

  // Practice / Certification views
  if (view === 'practice' && selectedTest) {
    return <PracticeTestView test={selectedTest} onCancel={handleCancelTest} />;
  }

  if (view === 'cert' && selectedTest) {
    return (
      <CertificationTestView
        test={selectedTest}
        onComplete={handleTestComplete}
        onCancel={handleCancelTest}
        onViewCertificate={() => setView('certificate')}
      />
    );
  }

  // Certificate view
  if (view === 'certificate' && testResult && testResult.attempt.passed) {
    const savedCert = getCertificateForTest(testResult.test.id);
    const certificate: CertificationCertificate = savedCert || {
      id: `cert-${Date.now()}`,
      testId: testResult.test.id,
      industry: testResult.test.industry,
      title: testResult.test.title,
      issuedAt: testResult.attempt.completedAt || new Date().toISOString(),
      attemptId: testResult.attempt.id,
      certificateNumber: `EW-${new Date().getFullYear()}-${testResult.test.industry.toUpperCase().slice(0, 3)}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    };
    
    return (
      <CertificateGenerator
        certificate={certificate}
        test={testResult.test}
      />
    );
  }

  // Tools view: study guide + flash cards
  if (view === 'tools' && selectedTest) {
    const cards = selectedTest.questions.map((q) => {
      const correct = q.options.find((o) => o.id === q.correctAnswer)?.text ?? q.correctAnswer;
      const back = [correct, q.explanation ? `\n\n${q.explanation}` : ''].join('');
      return { id: q.id, front: q.question, back, category: q.category };
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedTest(null);
                  setView('list');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Study Tools</h1>
                  <p className="text-sm text-gray-500">{selectedTest.title}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('practice')}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <GraduationCap className="w-4 h-4" />
                Practice
              </button>
              <button
                onClick={() => setView('cert')}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-pink-600 text-white rounded-lg font-semibold hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Award className="w-4 h-4" />
                Start Test
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StudyGuideGenerator test={selectedTest} />
          <FlashCardWidget
            title="Flash Cards"
            subtitle="Flip through prompts and answers from this certification question bank."
            cards={cards}
          />
        </div>
      </div>
    );
  }

  // Main certification selection view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/ee-training')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">EverWatt Certification</h1>
                <p className="text-sm text-gray-500">Industry-specific energy efficiency certification</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading certifications...</p>
          </div>
        ) : (
          <>
            {/* Intro */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Choose Your Certification</h2>
              <p className="text-slate-600">
                Select an industry-specific certification to validate your expertise in energy efficiency for that facility type.
                Each certification test covers industry-specific opportunities, equipment, and best practices.
              </p>
            </div>

            {/* Certification Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certifications.map((cert) => (
                <div
                  key={cert.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-pink-600 text-white flex items-center justify-center text-2xl flex-shrink-0">
                        {cert.icon || '🎓'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 mb-1">{cert.title}</h3>
                        {cert.subtitle && (
                          <p className="text-sm text-slate-600">{cert.subtitle}</p>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 mb-4 line-clamp-3">{cert.description}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                      {cert.timeLimit && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{cert.timeLimit} min</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{cert.questions.length} questions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>{cert.passingScore}% to pass</span>
                      </div>
                    </div>

                    {hasPassedTest(cert.id, cert.passingScore) ? (
                      <div className="space-y-2">
                        <div className="w-full py-2 px-4 bg-emerald-100 text-emerald-700 rounded-xl font-semibold text-center flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Certified
                        </div>
                        <button
                          onClick={() => {
                            const certData = getCertificateForTest(cert.id);
                            if (certData) {
                              // Set certificate directly for viewing
                              setSelectedTest(cert);
                              setTestResult({
                                attempt: {
                                  id: certData.attemptId,
                                  testId: cert.id,
                                  startedAt: certData.issuedAt,
                                  completedAt: certData.issuedAt,
                                  answers: {},
                                  score: 0,
                                  percentage: 100,
                                  passed: true,
                                },
                                test: cert,
                              });
                              setView('certificate');
                            }
                          }}
                          className="w-full py-2 px-4 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-all text-sm"
                        >
                          View Certificate
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTest(cert);
                            setView('tools');
                          }}
                          className="w-full py-2 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all text-sm flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Study Tools
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleStartTest(cert)}
                          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        >
                          <Award className="w-4 h-4" />
                          Start Certification Test
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              setSelectedTest(cert);
                              setView('practice');
                            }}
                            className="py-2 px-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all text-sm flex items-center justify-center gap-2"
                          >
                            <GraduationCap className="w-4 h-4" />
                            Practice
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTest(cert);
                              setView('tools');
                            }}
                            className="py-2 px-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all text-sm flex items-center justify-center gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            Study Tools
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {certifications.length === 0 && (
              <div className="text-center py-12">
                <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No certifications available yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

