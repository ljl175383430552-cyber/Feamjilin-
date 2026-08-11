import { useCallback, useEffect, useState } from 'react';
import {
  clearVault,
  loadStoredVault,
  saveEncryptedVault,
  savePlainVault,
  unlockEncryptedVault,
} from '@/src/lib/storage';
import type { KeyEntry } from '@/src/types';

type Mode = 'booting' | 'setup' | 'locked' | 'ready';

interface VaultHook {
  mode: Mode;
  entries: KeyEntry[];
  encrypted: boolean;
  error: string | null;
  setup: (passphrase: string | null) => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  lock: () => void;
  upsert: (entry: KeyEntry) => Promise<void>;
  remove: (id: string) => Promise<void>;
  replaceAll: (entries: KeyEntry[]) => Promise<void>;
  wipe: () => void;
  clearError: () => void;
}

export function useVault(): VaultHook {
  const [mode, setMode] = useState<Mode>('booting');
  const [entries, setEntries] = useState<KeyEntry[]>([]);
  const [passphrase, setPassphrase] = useState<string | null>(null);
  const [encrypted, setEncrypted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadStoredVault();
    if (!stored) {
      setMode('setup');
      return;
    }
    if (stored.kind === 'plain') {
      setEntries(stored.payload.entries);
      setEncrypted(false);
      setMode('ready');
      return;
    }
    setEncrypted(true);
    setMode('locked');
  }, []);

  const persist = useCallback(
    async (next: KeyEntry[], pass: string | null, useEncryption: boolean) => {
      if (useEncryption && pass) {
        await saveEncryptedVault(pass, next);
      } else {
        savePlainVault(next);
      }
      setEntries(next);
    },
    [],
  );

  const setup = useCallback(async (pass: string | null) => {
    setError(null);
    const useEncryption = Boolean(pass && pass.length >= 6);
    setPassphrase(useEncryption ? pass : null);
    setEncrypted(useEncryption);
    await persist([], useEncryption ? pass : null, useEncryption);
    setMode('ready');
  }, [persist]);

  const unlock = useCallback(async (pass: string) => {
    setError(null);
    const stored = loadStoredVault();
    if (!stored || stored.kind !== 'encrypted') {
      setError('未找到加密保险库');
      return;
    }
    try {
      const next = await unlockEncryptedVault(pass, stored.salt, stored.ciphertext);
      setPassphrase(pass);
      setEntries(next);
      setEncrypted(true);
      setMode('ready');
    } catch {
      setError('主密码不正确或数据已损坏');
    }
  }, []);

  const lock = useCallback(() => {
    if (!encrypted) return;
    setPassphrase(null);
    setEntries([]);
    setMode('locked');
  }, [encrypted]);

  const upsert = useCallback(
    async (entry: KeyEntry) => {
      const exists = entries.some((e) => e.id === entry.id);
      const next = exists
        ? entries.map((e) => (e.id === entry.id ? entry : e))
        : [entry, ...entries];
      await persist(next, passphrase, encrypted);
    },
    [entries, passphrase, encrypted, persist],
  );

  const remove = useCallback(
    async (id: string) => {
      const next = entries.filter((e) => e.id !== id);
      await persist(next, passphrase, encrypted);
    },
    [entries, passphrase, encrypted, persist],
  );

  const replaceAll = useCallback(
    async (next: KeyEntry[]) => {
      await persist(next, passphrase, encrypted);
    },
    [passphrase, encrypted, persist],
  );

  const wipe = useCallback(() => {
    clearVault();
    setEntries([]);
    setPassphrase(null);
    setEncrypted(false);
    setMode('setup');
  }, []);

  return {
    mode,
    entries,
    encrypted,
    error,
    setup,
    unlock,
    lock,
    upsert,
    remove,
    replaceAll,
    wipe,
    clearError: () => setError(null),
  };
}
