import { describe, expect, it, vi } from 'vitest';

function setBrowserMode(on: boolean) {
  if (on) {
    (globalThis as any).window = {};
    return;
  }
  try {
    delete (globalThis as any).window;
  } catch {
    (globalThis as any).window = undefined;
  }
}

describe('P0 hardening: OpenAI key safety', () => {
  it('ai-config never returns an API key in browser-mode simulation', async () => {
    const prevKey = process.env.OPENAI_API_KEY;
    try {
      process.env.OPENAI_API_KEY = 'sk-test-should-not-leak';
      vi.resetModules();
      setBrowserMode(true);

      const mod = await import('../src/config/ai-config');
      expect(mod.getOpenAIKey()).toBeUndefined();
      expect(mod.aiConfig.openaiApiKey).toBeUndefined();
      expect(mod.aiConfig.isEnabled).toBe(false);
    } finally {
      setBrowserMode(false);
      vi.resetModules();
      process.env.OPENAI_API_KEY = prevKey;
    }
  });

  it('llm-insights refuses to load in browser-mode simulation', async () => {
    vi.resetModules();
    setBrowserMode(true);
    await expect(import('../src/services/llm-insights')).rejects.toThrow(/server-only/i);
    setBrowserMode(false);
    vi.resetModules();
  });
});

