import OpenAI from 'openai';

export type ChatRole = 'system' | 'user' | 'assistant';
export type ChatMessage = { role: ChatRole; content: string };

export type ChatRequest = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
};

export type ChatResponse = {
  text: string;
  model: string;
};

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey });
}

export async function chatCompletion(req: ChatRequest): Promise<ChatResponse> {
  const model = req.model || 'gpt-4o-mini';
  const temperature = typeof req.temperature === 'number' ? req.temperature : 0.2;

  const messages = Array.isArray(req.messages) ? req.messages : [];
  if (messages.length === 0) {
    throw new Error('messages is required');
  }

  const client = getClient();
  const result = await client.chat.completions.create({
    model,
    temperature,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const text = result.choices?.[0]?.message?.content || '';
  return { text, model };
}
