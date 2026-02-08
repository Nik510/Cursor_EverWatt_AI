/**
 * Certificate Generator
 * Displays and generates downloadable certificates for passed certifications
 */

import React, { useRef } from 'react';
import { Download, Share2, CheckCircle, Award } from 'lucide-react';
import type { CertificationCertificate, CertificationTest } from '../../../backend/ee-training/types';

export interface CertificateGeneratorProps {
  certificate: CertificationCertificate;
  test: CertificationTest;
  recipientName?: string;
}

export const CertificateGenerator: React.FC<CertificateGeneratorProps> = ({
  certificate,
  test,
  recipientName = 'Certificate Holder',
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);

  const generateCertificateNumber = (): string => {
    const date = new Date(certificate.issuedAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `EW-${year}${month}-${certificate.industry.toUpperCase().slice(0, 3)}-${random}`;
  };

  const certNumber = certificate.certificateNumber || generateCertificateNumber();

  const handleDownload = () => {
    if (!certificateRef.current) return;

    // Create a canvas for better PDF quality
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 900;
    canvas.width = width;
    canvas.height = height;

    // Draw certificate background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw border
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Draw decorative elements
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('EVERWATT', width / 2, 150);

    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 36px Arial';
    ctx.fillText('ENERGY EFFICIENCY CERTIFICATION', width / 2, 220);

    ctx.fillStyle = '#64748b';
    ctx.font = '24px Arial';
    ctx.fillText('This certifies that', width / 2, 320);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 40px Arial';
    ctx.fillText(recipientName, width / 2, 400);

    ctx.fillStyle = '#64748b';
    ctx.font = '20px Arial';
    ctx.fillText(`has successfully completed the`, width / 2, 460);
    ctx.fillText(test.title, width / 2, 500);

    ctx.fillStyle = '#64748b';
    ctx.font = '18px Arial';
    ctx.fillText(`Certificate Number: ${certNumber}`, width / 2, 600);
    
    const issueDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    ctx.fillText(`Issued: ${issueDate}`, width / 2, 640);

    // Convert to image and download
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `EverWatt-Certificate-${certNumber}.png`;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `EverWatt Certification - ${test.title}`,
        text: `I've earned my EverWatt Energy Efficiency Certification for ${test.industry}!`,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Certificate link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Certificate Display */}
        <div
          ref={certificateRef}
          className="bg-white rounded-2xl border-8 border-indigo-600 shadow-2xl overflow-hidden mb-8"
          style={{
            aspectRatio: '4/3',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          }}
        >
          {/* Decorative Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-pink-600 p-8 text-center text-white">
            <div className="text-5xl mb-4">⚡</div>
            <h1 className="text-4xl font-bold mb-2">EVERWATT</h1>
            <p className="text-xl font-semibold">ENERGY EFFICIENCY CERTIFICATION</p>
          </div>

          {/* Certificate Content */}
          <div className="p-12 text-center">
            <div className="mb-8">
              <p className="text-slate-600 text-lg mb-4">This certifies that</p>
              <h2 className="text-4xl font-bold text-slate-900 mb-2">{recipientName}</h2>
              <p className="text-slate-600 text-lg mb-6">has successfully completed the</p>
              <h3 className="text-2xl font-bold text-indigo-600 mb-2">{test.title}</h3>
              {test.subtitle && (
                <p className="text-slate-600">{test.subtitle}</p>
              )}
            </div>

            {/* Certificate Details */}
            <div className="mt-12 pt-8 border-t-2 border-slate-200">
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-slate-500 mb-1">Certificate Number</p>
                  <p className="font-mono font-semibold text-slate-900">{certNumber}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Issue Date</p>
                  <p className="font-semibold text-slate-900">
                    {new Date(certificate.issuedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Seal/Signature Area */}
            <div className="mt-8 flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-2 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Award className="w-12 h-12 text-indigo-600" />
                </div>
                <p className="text-xs text-slate-500">EverWatt Training</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleDownload}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-indigo-600 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Certificate
            </button>
            <button
              onClick={handleShare}
              className="px-6 py-4 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-all flex items-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
          </div>

          {/* Verification Info */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700">
                <p className="font-semibold mb-1">Certificate Verification</p>
                <p className="text-slate-600">
                  This certificate can be verified using certificate number <strong>{certNumber}</strong>.
                  {certificate.verificationUrl && (
                    <> Verification URL: <a href={certificate.verificationUrl} className="text-indigo-600 hover:underline">{certificate.verificationUrl}</a></>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4">What's Next?</h3>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Add this certification to your LinkedIn profile</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Include it in your resume or email signature</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Explore other industry certifications to expand your expertise</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

