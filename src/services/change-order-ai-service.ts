import type { ChangeOrderAiBody, ChangeOrderInput } from '../types/change-order';
import { chatCompletion } from './ai-service';

function buildPrompt(input: ChangeOrderInput): { system: string; user: string } {
  const system = [
    'You are a senior construction/energy services contract writer.',
    'Write clear, professional, client-ready change orders.',
    'Return ONLY valid JSON. No markdown. No extra keys. No commentary.',
    'Be concise but complete. Avoid legal overreach; use plain-language terms.',
  ].join(' ');

  const user = JSON.stringify(
    {
      task: 'Generate a professional change order body.',
      input,
      outputFormat: {
        subjectLine: 'string',
        summary: 'string (1-3 paragraphs)',
        scopeOfWork: 'string[] (bulleted items)',
        exclusions: 'string[] (optional)',
        scheduleImpact: 'string (optional)',
        pricing: { amountUsd: 'number', pricingNotes: 'string (optional)' },
        termsAndConditions: 'string[] (5-10 items)',
      },
      guidance: {
        include: [
          'Project identifiers (Project #, OBF# if present)',
          'Client/company and site info',
          'Clear description of requested change and why',
          'Scope of work bullets with assumptions',
          'Schedule impact statement (or “No schedule impact” if unknown)',
          'Pricing statement matching amountUsd',
          'Approval/signature-ready terms (payment terms, validity, change management, exclusions)',
        ],
        style: 'Professional business tone. No jargon. No placeholders like [CLIENT].',
      },
    },
    null,
    2
  );

  return { system, user };
}

function safeJsonParse<T>(text: string): T {
  const trimmed = String(text || '').trim();
  // Attempt strict parse first
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Try to salvage if model wrapped JSON in text
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const slice = trimmed.slice(start, end + 1);
      return JSON.parse(slice) as T;
    }
    throw new Error('AI response was not valid JSON');
  }
}

export async function generateChangeOrderAiBody(input: ChangeOrderInput): Promise<{ aiBody: ChangeOrderAiBody; model: string }> {
  const { system, user } = buildPrompt(input);
  const resp = await chatCompletion({
    temperature: 0.3,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const aiBody = safeJsonParse<ChangeOrderAiBody>(resp.text);
  return { aiBody, model: resp.model };
}


