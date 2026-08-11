export type AiProviderId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'groq'
  | 'xai'
  | 'mistral'
  | 'ollama'
  | 'custom';

export interface ConfigField {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  secret?: boolean;
}

export interface ProviderPreset {
  id: AiProviderId;
  name: string;
  vendor: string;
  docsUrl: string;
  defaultBaseUrl: string;
  fields: ConfigField[];
  /** 可用 {{field}} 占位，导出时自动替换 */
  configTemplates: {
    id: string;
    label: string;
    language: 'env' | 'json' | 'yaml' | 'curl' | 'text';
    body: string;
  }[];
}

export interface KeyEntry {
  id: string;
  providerId: AiProviderId;
  title: string;
  /** 字段值，如 apiKey / baseUrl / model */
  values: Record<string, string>;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VaultPayload {
  version: 1;
  entries: KeyEntry[];
  updatedAt: string;
}

export type VaultState =
  | { status: 'empty' }
  | { status: 'locked'; salt: string; ciphertext: string }
  | { status: 'unlocked'; passphrase: string; entries: KeyEntry[] };
