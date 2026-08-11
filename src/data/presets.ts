import type { ProviderPreset } from '@/src/types';

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    vendor: 'OpenAI',
    docsUrl: 'https://platform.openai.com/docs/api-reference',
    defaultBaseUrl: 'https://api.openai.com/v1',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'sk-...', secret: true },
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://api.openai.com/v1' },
      { key: 'model', label: '默认模型', placeholder: 'gpt-4.1' },
      { key: 'orgId', label: 'Organization ID', placeholder: 'org-...' },
    ],
    configTemplates: [
      {
        id: 'env',
        label: '.env',
        language: 'env',
        body: `OPENAI_API_KEY={{apiKey}}
OPENAI_BASE_URL={{baseUrl}}
OPENAI_MODEL={{model}}
OPENAI_ORG_ID={{orgId}}`,
      },
      {
        id: 'json',
        label: 'JSON',
        language: 'json',
        body: `{
  "provider": "openai",
  "apiKey": "{{apiKey}}",
  "baseUrl": "{{baseUrl}}",
  "model": "{{model}}",
  "organization": "{{orgId}}"
}`,
      },
      {
        id: 'curl',
        label: 'cURL',
        language: 'curl',
        body: `curl {{baseUrl}}/chat/completions \\
  -H "Authorization: Bearer {{apiKey}}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"{{model}}","messages":[{"role":"user","content":"hello"}]}'`,
      },
    ],
  },
  {
    id: 'anthropic',
    name: 'Claude',
    vendor: 'Anthropic',
    docsUrl: 'https://docs.anthropic.com/en/api',
    defaultBaseUrl: 'https://api.anthropic.com',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'sk-ant-...', secret: true },
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://api.anthropic.com' },
      { key: 'model', label: '默认模型', placeholder: 'claude-sonnet-4-20250514' },
      { key: 'version', label: 'API Version', placeholder: '2023-06-01' },
    ],
    configTemplates: [
      {
        id: 'env',
        label: '.env',
        language: 'env',
        body: `ANTHROPIC_API_KEY={{apiKey}}
ANTHROPIC_BASE_URL={{baseUrl}}
ANTHROPIC_MODEL={{model}}
ANTHROPIC_VERSION={{version}}`,
      },
      {
        id: 'json',
        label: 'JSON',
        language: 'json',
        body: `{
  "provider": "anthropic",
  "apiKey": "{{apiKey}}",
  "baseUrl": "{{baseUrl}}",
  "model": "{{model}}",
  "anthropic-version": "{{version}}"
}`,
      },
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    vendor: 'Google',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'AIza...', secret: true },
      { key: 'baseUrl', label: 'Base URL' },
      { key: 'model', label: '默认模型', placeholder: 'gemini-2.5-flash' },
    ],
    configTemplates: [
      {
        id: 'env',
        label: '.env',
        language: 'env',
        body: `GEMINI_API_KEY={{apiKey}}
GOOGLE_API_KEY={{apiKey}}
GEMINI_BASE_URL={{baseUrl}}
GEMINI_MODEL={{model}}`,
      },
      {
        id: 'json',
        label: 'JSON',
        language: 'json',
        body: `{
  "provider": "gemini",
  "apiKey": "{{apiKey}}",
  "baseUrl": "{{baseUrl}}",
  "model": "{{model}}"
}`,
      },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    vendor: 'DeepSeek',
    docsUrl: 'https://api-docs.deepseek.com',
    defaultBaseUrl: 'https://api.deepseek.com',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'sk-...', secret: true },
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://api.deepseek.com' },
      { key: 'model', label: '默认模型', placeholder: 'deepseek-chat' },
    ],
    configTemplates: [
      {
        id: 'env',
        label: '.env',
        language: 'env',
        body: `DEEPSEEK_API_KEY={{apiKey}}
DEEPSEEK_BASE_URL={{baseUrl}}
DEEPSEEK_MODEL={{model}}`,
      },
      {
        id: 'openai-compat',
        label: 'OpenAI 兼容 JSON',
        language: 'json',
        body: `{
  "provider": "deepseek",
  "apiKey": "{{apiKey}}",
  "baseUrl": "{{baseUrl}}",
  "model": "{{model}}",
  "compatible": "openai"
}`,
      },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    vendor: 'Groq',
    docsUrl: 'https://console.groq.com/docs',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'gsk_...', secret: true },
      { key: 'baseUrl', label: 'Base URL' },
      { key: 'model', label: '默认模型', placeholder: 'llama-3.3-70b-versatile' },
    ],
    configTemplates: [
      {
        id: 'env',
        label: '.env',
        language: 'env',
        body: `GROQ_API_KEY={{apiKey}}
GROQ_BASE_URL={{baseUrl}}
GROQ_MODEL={{model}}`,
      },
    ],
  },
  {
    id: 'xai',
    name: 'xAI / Grok',
    vendor: 'xAI',
    docsUrl: 'https://docs.x.ai/docs',
    defaultBaseUrl: 'https://api.x.ai/v1',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'xai-...', secret: true },
      { key: 'baseUrl', label: 'Base URL' },
      { key: 'model', label: '默认模型', placeholder: 'grok-3' },
    ],
    configTemplates: [
      {
        id: 'env',
        label: '.env',
        language: 'env',
        body: `XAI_API_KEY={{apiKey}}
XAI_BASE_URL={{baseUrl}}
XAI_MODEL={{model}}`,
      },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    vendor: 'Mistral AI',
    docsUrl: 'https://docs.mistral.ai',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    fields: [
      { key: 'apiKey', label: 'API Key', secret: true },
      { key: 'baseUrl', label: 'Base URL' },
      { key: 'model', label: '默认模型', placeholder: 'mistral-large-latest' },
    ],
    configTemplates: [
      {
        id: 'env',
        label: '.env',
        language: 'env',
        body: `MISTRAL_API_KEY={{apiKey}}
MISTRAL_BASE_URL={{baseUrl}}
MISTRAL_MODEL={{model}}`,
      },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    vendor: 'Local',
    docsUrl: 'https://github.com/ollama/ollama/blob/main/docs/api.md',
    defaultBaseUrl: 'http://localhost:11434',
    fields: [
      { key: 'apiKey', label: 'API Key（可选）', secret: true },
      { key: 'baseUrl', label: 'Base URL', placeholder: 'http://localhost:11434' },
      { key: 'model', label: '默认模型', placeholder: 'llama3.2' },
    ],
    configTemplates: [
      {
        id: 'env',
        label: '.env',
        language: 'env',
        body: `OLLAMA_HOST={{baseUrl}}
OLLAMA_MODEL={{model}}`,
      },
    ],
  },
  {
    id: 'custom',
    name: '自定义',
    vendor: 'Custom',
    docsUrl: '',
    defaultBaseUrl: '',
    fields: [
      { key: 'apiKey', label: 'API Key', secret: true },
      { key: 'baseUrl', label: 'Base URL' },
      { key: 'model', label: '模型' },
      {
        key: 'headers',
        label: '额外 Headers (JSON)',
        placeholder: '{"X-Custom":"value"}',
        multiline: true,
      },
      {
        key: 'extra',
        label: '其他配置',
        multiline: true,
      },
    ],
    configTemplates: [
      {
        id: 'env',
        label: '.env',
        language: 'env',
        body: `CUSTOM_API_KEY={{apiKey}}
CUSTOM_BASE_URL={{baseUrl}}
CUSTOM_MODEL={{model}}`,
      },
      {
        id: 'json',
        label: 'JSON',
        language: 'json',
        body: `{
  "provider": "custom",
  "apiKey": "{{apiKey}}",
  "baseUrl": "{{baseUrl}}",
  "model": "{{model}}",
  "headers": {{headers}},
  "extra": "{{extra}}"
}`,
      },
    ],
  },
];

export function getPreset(id: string): ProviderPreset {
  return PROVIDER_PRESETS.find((p) => p.id === id) ?? PROVIDER_PRESETS[PROVIDER_PRESETS.length - 1];
}

export function renderTemplate(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? '');
}
