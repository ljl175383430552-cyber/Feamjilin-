import { decryptJson, encryptJson } from '@/src/lib/crypto';
import type { KeyEntry, VaultPayload } from '@/src/types';

const STORAGE_KEY = 'keyledger.vault.v1';

export type StoredVault =
  | { kind: 'plain'; payload: VaultPayload }
  | { kind: 'encrypted'; salt: string; ciphertext: string };

export function loadStoredVault(): StoredVault | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredVault;
  } catch {
    return null;
  }
}

export function savePlainVault(entries: KeyEntry[]): void {
  const payload: VaultPayload = {
    version: 1,
    entries,
    updatedAt: new Date().toISOString(),
  };
  const stored: StoredVault = { kind: 'plain', payload };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export async function saveEncryptedVault(passphrase: string, entries: KeyEntry[]): Promise<void> {
  const payload: VaultPayload = {
    version: 1,
    entries,
    updatedAt: new Date().toISOString(),
  };
  const { salt, ciphertext } = await encryptJson(passphrase, payload);
  const stored: StoredVault = { kind: 'encrypted', salt, ciphertext };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export async function unlockEncryptedVault(
  passphrase: string,
  salt: string,
  ciphertext: string,
): Promise<KeyEntry[]> {
  const payload = await decryptJson<VaultPayload>(passphrase, salt, ciphertext);
  return payload.entries ?? [];
}

export function clearVault(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportVaultJson(entries: KeyEntry[]): string {
  const payload: VaultPayload = {
    version: 1,
    entries,
    updatedAt: new Date().toISOString(),
  };
  return JSON.stringify(payload, null, 2);
}

export function importVaultJson(text: string): KeyEntry[] {
  const parsed = JSON.parse(text) as VaultPayload | KeyEntry[];
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.entries)) return parsed.entries;
  throw new Error('无法识别的导入格式');
}
