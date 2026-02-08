/**
 * Certification Storage
 * Simple localStorage-based tracking for certification attempts and certificates
 * In production, this would be replaced with a backend API
 */

import type { CertificationAttempt, CertificationCertificate } from '../backend/ee-training/types';

const STORAGE_KEYS = {
  ATTEMPTS: 'everwatt_cert_attempts',
  CERTIFICATES: 'everwatt_certificates',
  PROGRESS: 'everwatt_cert_progress',
} as const;

/**
 * Save a certification attempt
 */
export function saveCertificationAttempt(attempt: CertificationAttempt): void {
  try {
    const attempts = getCertificationAttempts();
    attempts.push(attempt);
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));
  } catch (error) {
    console.error('Error saving certification attempt:', error);
  }
}

/**
 * Get all certification attempts
 */
export function getCertificationAttempts(): CertificationAttempt[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading certification attempts:', error);
    return [];
  }
}

/**
 * Get attempts for a specific test
 */
export function getAttemptsForTest(testId: string): CertificationAttempt[] {
  const attempts = getCertificationAttempts();
  return attempts.filter(a => a.testId === testId);
}

/**
 * Get best attempt for a test
 */
export function getBestAttempt(testId: string): CertificationAttempt | null {
  const attempts = getAttemptsForTest(testId);
  if (attempts.length === 0) return null;
  
  return attempts.reduce((best, current) => {
    return current.percentage > best.percentage ? current : best;
  });
}

/**
 * Check if user has passed a test
 */
export function hasPassedTest(testId: string, passingScore: number): boolean {
  const best = getBestAttempt(testId);
  return best !== null && best.passed && best.percentage >= passingScore;
}

/**
 * Save a certificate
 */
export function saveCertificate(certificate: CertificationCertificate): void {
  try {
    const certificates = getCertificates();
    certificates.push(certificate);
    localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(certificates));
  } catch (error) {
    console.error('Error saving certificate:', error);
  }
}

/**
 * Get all certificates
 */
export function getCertificates(): CertificationCertificate[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CERTIFICATES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading certificates:', error);
    return [];
  }
}

/**
 * Get certificate for a test
 */
export function getCertificateForTest(testId: string): CertificationCertificate | null {
  const certificates = getCertificates();
  return certificates.find(c => c.testId === testId) || null;
}

/**
 * Clear all certification data (for testing/reset)
 */
export function clearCertificationData(): void {
  localStorage.removeItem(STORAGE_KEYS.ATTEMPTS);
  localStorage.removeItem(STORAGE_KEYS.CERTIFICATES);
  localStorage.removeItem(STORAGE_KEYS.PROGRESS);
}

