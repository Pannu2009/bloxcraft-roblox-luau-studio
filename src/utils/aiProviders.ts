// aiProviders.ts — bring-your-own-AI: the user pastes their own API key and the
// app talks to the provider directly from the device. The key lives in
// localStorage on the device only; BloxCraft's servers never see it.

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface AIRequest {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface AIProvider {
  id: string;
  name: string;
  keyUrl: string;
  keyPlaceholder: string;
  defaultModel: string;
  needsBaseUrl: boolean;
  defaultBaseUrl: string;
  buildRequest: (apiKey: string, model: string, baseUrl: string, messages: ChatMessage[]) => AIRequest;
  parseResponse: (json: any) => string;
}

function openAICompatible(
  url: (base: string) => string,
  extraHeaders: Record<string, string> = {}
): Pick<AIProvider, 'buildRequest' | 'parseResponse'> {
  return {
    buildRequest: (apiKey, model, baseUrl, messages) => ({
      url: url(baseUrl.replace(/\/+$/, '')),
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': 'Bearer ' + apiKey } : {}),
        ...extraHeaders,
      },
      body: {
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.text })),
        temperature: 0.3,
      },
    }),
    parseResponse: (json) => {
      const text = json?.choices?.[0]?.message?.content;
      if (typeof text === 'string' && text.trim()) return text;
      throw new Error(json?.error?.message || 'The provider returned an empty response.');
    },
  };
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-…',
    defaultModel: 'gpt-4o-mini',
    needsBaseUrl: false,
    defaultBaseUrl: 'https://api.openai.com/v1',
    ...openAICompatible((b) => `${b}/chat/completions`),
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    keyPlaceholder: 'sk-…',
    defaultModel: 'deepseek-chat',
    needsBaseUrl: false,
    defaultBaseUrl: 'https://api.deepseek.com',
    ...openAICompatible((b) => `${b}/chat/completions`),
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    keyUrl: 'https://openrouter.ai/keys',
    keyPlaceholder: 'sk-or-…',
    defaultModel: 'deepseek/deepseek-chat',
    needsBaseUrl: false,
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    ...openAICompatible((b) => `${b}/chat/completions`, {
      'HTTP-Referer': 'https://bloxcraft.app',
      'X-Title': 'BloxCraft Luau Studio',
    }),
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyPlaceholder: 'sk-ant-…',
    defaultModel: 'claude-sonnet-4-20250514',
    needsBaseUrl: false,
    defaultBaseUrl: 'https://api.anthropic.com',
    buildRequest: (apiKey, model, baseUrl, messages) => ({
      url: `${baseUrl.replace(/\/+$/, '')}/v1/messages`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: {
        model,
        max_tokens: 2048,
        messages: messages.map((m) => ({ role: m.role, content: m.text })),
      },
    }),
    parseResponse: (json) => {
      const text = json?.content?.find((c: any) => c.type === 'text')?.text;
      if (typeof text === 'string' && text.trim()) return text;
      throw new Error(json?.error?.message || 'The provider returned an empty response.');
    },
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'AIza…',
    defaultModel: 'gemini-2.0-flash',
    needsBaseUrl: false,
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    buildRequest: (apiKey, model, baseUrl, messages) => ({
      url: `${baseUrl.replace(/\/+$/, '')}/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.text }],
        })),
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      },
    }),
    parseResponse: (json) => {
      const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('');
      if (typeof text === 'string' && text.trim()) return text;
      throw new Error(json?.error?.message || 'The provider returned an empty response.');
    },
  },
  {
    id: 'ollama',
    name: 'Ollama (localhost — Termux / PC)',
    keyUrl: 'https://ollama.com/download',
    keyPlaceholder: 'not needed (leave empty)',
    defaultModel: 'deepseek-r1:8b',
    needsBaseUrl: true,
    defaultBaseUrl: 'http://localhost:11434/v1',
    ...openAICompatible((b) => `${b}/chat/completions`),
  },
  {
    id: 'custom',
    name: 'Custom (OpenAI-compatible)',
    keyUrl: '',
    keyPlaceholder: 'your api key',
    defaultModel: '',
    needsBaseUrl: true,
    defaultBaseUrl: '',
    ...openAICompatible((b) => `${b}/chat/completions`),
  },
];

export interface AISettings {
  providerId: string;
  apiKey: string;
  model: string;
  baseUrl: string;
}

const SETTINGS_KEY = 'bloxcraft_ai_settings';

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return {
        providerId: s.providerId || 'deepseek',
        apiKey: s.apiKey || '',
        model: s.model || '',
        baseUrl: s.baseUrl || '',
      };
    }
  } catch {}
  return { providerId: 'deepseek', apiKey: '', model: '', baseUrl: '' };
}

export function saveAISettings(s: AISettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

export function getProvider(id: string): AIProvider {
  return AI_PROVIDERS.find((p) => p.id === id) || AI_PROVIDERS[0];
}

export function effectiveModel(s: AISettings): string {
  return s.model.trim() || getProvider(s.providerId).defaultModel;
}

export function effectiveBaseUrl(s: AISettings): string {
  return s.baseUrl.trim() || getProvider(s.providerId).defaultBaseUrl;
}

/** Send one chat turn to the provider. Throws with a human message on failure. */
export async function chatWithAI(
  settings: AISettings,
  messages: ChatMessage[]
): Promise<string> {
  const provider = getProvider(settings.providerId);
  const needsKey = provider.id !== 'custom' && provider.id !== 'ollama';
  if (!settings.apiKey.trim() && needsKey) {
    throw new Error('Add your API key first (gear icon above). It stays on this device.');
  }
  if (provider.id === 'custom' && !effectiveBaseUrl(settings)) {
    throw new Error('Add your custom API base URL first (gear icon above).');
  }
  const req = provider.buildRequest(
    settings.apiKey.trim(),
    effectiveModel(settings),
    effectiveBaseUrl(settings),
    messages
  );
  let res: Response;
  try {
    res = await fetch(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(req.body),
    });
  } catch {
    throw new Error('Could not reach the provider. Check your connection and the base URL.');
  }
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Provider error ${res.status} (no JSON response).`);
  }
  if (!res.ok) {
    throw new Error(json?.error?.message || `Provider error ${res.status}.`);
  }
  return provider.parseResponse(json);
}

/** Pull the first fenced code block out of a reply (```luau … ```). */
export function extractCodeBlock(text: string): string | null {
  const m = text.match(/```(?:luau|lua)?\s*\n([\s\S]*?)```/);
  return m ? m[1].trim() : null;
}
