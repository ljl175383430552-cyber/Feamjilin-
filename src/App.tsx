import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getPreset, PROVIDER_PRESETS, renderTemplate } from '@/src/data/presets';
import { useVault } from '@/src/hooks/useVault';
import { exportVaultJson, importVaultJson } from '@/src/lib/storage';
import { cn } from '@/src/lib/utils';
import type { AiProviderId, KeyEntry } from '@/src/types';

function uid() {
  return crypto.randomUUID();
}

function mask(value: string) {
  if (!value) return '—';
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 3)}••••${value.slice(-4)}`;
}

function emptyValues(providerId: AiProviderId): Record<string, string> {
  const preset = getPreset(providerId);
  const values: Record<string, string> = {};
  for (const field of preset.fields) {
    values[field.key] = field.key === 'baseUrl' ? preset.defaultBaseUrl : '';
  }
  return values;
}

export default function App() {
  const vault = useVault();
  const [query, setQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<AiProviderId | 'all'>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<KeyEntry | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [revealSecrets, setRevealSecrets] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vault.entries.filter((entry) => {
      if (providerFilter !== 'all' && entry.providerId !== providerFilter) return false;
      if (!q) return true;
      const hay = [
        entry.title,
        entry.notes,
        entry.providerId,
        ...entry.tags,
        ...Object.values(entry.values),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [vault.entries, query, providerFilter]);

  const selected = vault.entries.find((e) => e.id === selectedId) ?? null;

  const copyText = async (text: string, token: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(token);
    window.setTimeout(() => setCopied(null), 1400);
  };

  const openCreate = (providerId: AiProviderId = 'openai') => {
    const now = new Date().toISOString();
    setEditing({
      id: uid(),
      providerId,
      title: `${getPreset(providerId).name} 密钥`,
      values: emptyValues(providerId),
      notes: '',
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
    setEditorOpen(true);
  };

  const openEdit = (entry: KeyEntry) => {
    setEditing({ ...entry, values: { ...entry.values }, tags: [...entry.tags] });
    setEditorOpen(true);
  };

  const saveEntry = async () => {
    if (!editing) return;
    const next: KeyEntry = {
      ...editing,
      title: editing.title.trim() || getPreset(editing.providerId).name,
      updatedAt: new Date().toISOString(),
      tags: editing.tags.map((t) => t.trim()).filter(Boolean),
    };
    await vault.upsert(next);
    setSelectedId(next.id);
    setEditorOpen(false);
    setEditing(null);
  };

  const onExport = () => {
    const blob = new Blob([exportVaultJson(vault.entries)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keyledger-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File) => {
    const text = await file.text();
    const imported = importVaultJson(text);
    await vault.replaceAll([...imported, ...vault.entries]);
  };

  if (vault.mode === 'booting') {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--neu-bg)]">
        <p className="text-sm text-[var(--neu-muted)]">载入保险库…</p>
      </div>
    );
  }

  if (vault.mode === 'setup') {
    return <GateScreen mode="setup" error={vault.error} onSubmit={vault.setup} />;
  }

  if (vault.mode === 'locked') {
    return (
      <GateScreen
        mode="unlock"
        error={vault.error}
        onSubmit={async (pass) => {
          if (!pass) return;
          await vault.unlock(pass);
        }}
      />
    );
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[var(--neu-bg)] text-[var(--neu-fg)]">
      <DecorBackdrop />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-7xl flex-col px-4 py-8 md:px-8 md:py-12">
        <header className="mb-8 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="flex items-start gap-4"
          >
            <div className="neu-well neu-float grid size-16 shrink-0 place-items-center rounded-[20px]">
              <div className="neu-extruded-sm grid size-10 place-items-center rounded-xl bg-[var(--neu-bg)] text-[var(--neu-accent)]">
                <KeyRound className="size-5" />
              </div>
            </div>
            <div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
                KeyLedger
              </h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--neu-muted)] md:text-base">
                本地记录各 AI 工具的 API Key 与配置格式。数据只存在浏览器，可选用主密码加密。
              </p>
            </div>
          </motion.div>

          <motion.div
            className="flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.4 }}
          >
            <button type="button" className="neu-btn neu-btn-primary" onClick={() => openCreate()}>
              <Plus className="size-4" />
              新建记录
            </button>
            <button type="button" className="neu-btn" onClick={onExport}>
              <Download className="size-4" />
              导出
            </button>
            <label className="inline-flex">
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onImport(file);
                  e.target.value = '';
                }}
              />
              <span className="neu-btn cursor-pointer">
                <Upload className="size-4" />
                导入
              </span>
            </label>
            {vault.encrypted && (
              <button type="button" className="neu-btn" onClick={vault.lock}>
                <Lock className="size-4" />
                锁定
              </button>
            )}
          </motion.div>
        </header>

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--neu-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索标题、标签、备注或密钥片段"
              className="neu-field w-full pl-11"
            />
          </div>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value as AiProviderId | 'all')}
            className="neu-field md:w-52"
          >
            <option value="all">全部提供商</option>
            {PROVIDER_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-8 flex gap-2 overflow-x-auto pb-1">
          {PROVIDER_PRESETS.map((p, i) => (
            <motion.button
              key={p.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i, duration: 0.3 }}
              onClick={() => openCreate(p.id)}
              className="neu-chip shrink-0"
            >
              + {p.name}
            </motion.button>
          ))}
        </div>

        <div className="grid flex-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-4">
            {filtered.length === 0 ? (
              <div className="neu-card grid min-h-72 place-items-center p-8 text-center md:p-12">
                <div>
                  <div className="neu-well mx-auto mb-5 grid size-16 place-items-center">
                    <KeyRound className="size-7 text-[var(--neu-accent)]" />
                  </div>
                  <p className="font-display text-2xl font-bold tracking-tight">还没有密钥记录</p>
                  <p className="mt-2 text-sm text-[var(--neu-muted)]">
                    从上方提供商快捷入口开始，或点击「新建记录」。
                  </p>
                </div>
              </div>
            ) : (
              filtered.map((entry, i) => {
                const preset = getPreset(entry.providerId);
                const active = selectedId === entry.id;
                return (
                  <motion.button
                    key={entry.id}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.24), duration: 0.3 }}
                    onClick={() => setSelectedId(entry.id)}
                    className={cn(
                      'neu-card neu-card-interactive w-full p-5 text-left md:p-6',
                      active && 'ring-2 ring-[var(--neu-accent)] ring-offset-2 ring-offset-[var(--neu-bg)]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="neu-well grid size-12 shrink-0 place-items-center">
                          <span className="font-display text-xs font-bold text-[var(--neu-accent)]">
                            {preset.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-display text-lg font-bold tracking-tight">{entry.title}</p>
                          <p className="mt-1 font-mono text-xs text-[var(--neu-muted)]">
                            {preset.vendor} · {mask(entry.values.apiKey ?? '')}
                          </p>
                        </div>
                      </div>
                      <span className="neu-inset-sm rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide text-[var(--neu-muted)] uppercase">
                        {preset.name}
                      </span>
                    </div>
                    {entry.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="neu-inset-sm rounded-full px-2.5 py-1 text-[10px] text-[var(--neu-muted)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.button>
                );
              })
            )}
          </section>

          <aside className="neu-card h-fit min-h-72 p-6 md:sticky md:top-6 md:p-8">
            {!selected ? (
              <div className="grid min-h-56 place-items-center text-center text-sm text-[var(--neu-muted)]">
                选择一条记录查看配置格式
              </div>
            ) : (
              <DetailPane
                entry={selected}
                revealSecrets={revealSecrets}
                copied={copied}
                onToggleReveal={() => setRevealSecrets((v) => !v)}
                onCopy={copyText}
                onEdit={() => openEdit(selected)}
                onDelete={async () => {
                  if (!confirm('确定删除这条记录？')) return;
                  await vault.remove(selected.id);
                  setSelectedId(null);
                }}
              />
            )}
          </aside>
        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t-0 pt-2 text-xs text-[var(--neu-muted)]">
          <span className="inline-flex items-center gap-2">
            <span className="neu-extruded-sm grid size-8 place-items-center rounded-xl">
              <Shield className="size-3.5 text-[var(--neu-success)]" />
            </span>
            {vault.encrypted ? 'AES-GCM 加密本地存储' : '明文本地存储（可重建并启用主密码）'}
          </span>
          <button
            type="button"
            className="underline-offset-2 hover:text-[var(--neu-danger)] hover:underline"
            onClick={() => {
              if (confirm('将清空本机全部 KeyLedger 数据，且不可恢复。继续？')) vault.wipe();
            }}
          >
            清空保险库
          </button>
        </footer>
      </div>

      <AnimatePresence>
        {editorOpen && editing && (
          <EditorModal
            entry={editing}
            onChange={setEditing}
            onClose={() => {
              setEditorOpen(false);
              setEditing(null);
            }}
            onSave={() => void saveEntry()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DecorBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="neu-decor neu-extruded top-[-80px] right-[-60px] size-56 opacity-70" />
      <div className="neu-decor neu-inset-deep bottom-[12%] left-[-40px] size-40 opacity-60" />
      <div className="neu-decor neu-extruded-sm top-[40%] right-[8%] size-24 opacity-50" />
    </div>
  );
}

function GateScreen({
  mode,
  error,
  onSubmit,
}: {
  mode: 'setup' | 'unlock';
  error: string | null;
  onSubmit: (passphrase: string | null) => Promise<void>;
}) {
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [skipEncrypt, setSkipEncrypt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async () => {
    setLocalError(null);
    if (mode === 'setup') {
      if (!skipEncrypt) {
        if (pass.length < 6) {
          setLocalError('主密码至少 6 位');
          return;
        }
        if (pass !== pass2) {
          setLocalError('两次输入不一致');
          return;
        }
      }
      setBusy(true);
      await onSubmit(skipEncrypt ? null : pass);
      setBusy(false);
      return;
    }
    setBusy(true);
    await onSubmit(pass);
    setBusy(false);
  };

  return (
    <div className="relative grid min-h-dvh place-items-center bg-[var(--neu-bg)] px-4">
      <DecorBackdrop />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="neu-card relative z-10 w-full max-w-md p-8 md:p-10"
      >
        <div className="neu-well neu-float mx-auto mb-6 grid size-16 place-items-center">
          <div className="neu-extruded-sm grid size-10 place-items-center rounded-xl text-[var(--neu-accent)]">
            <KeyRound className="size-5" />
          </div>
        </div>
        <h1 className="text-center font-display text-3xl font-extrabold tracking-tight">KeyLedger</h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-[var(--neu-muted)]">
          {mode === 'setup'
            ? '首次使用：可选设置主密码，密钥将 AES-GCM 加密后写入 localStorage。'
            : '保险库已锁定，输入主密码解锁。'}
        </p>

        {mode === 'setup' && (
          <label className="mt-6 flex items-center gap-3 text-sm text-[var(--neu-muted)]">
            <span className="neu-inset-sm grid size-6 place-items-center rounded-lg">
              <input
                type="checkbox"
                checked={skipEncrypt}
                onChange={(e) => setSkipEncrypt(e.target.checked)}
                className="size-3.5 accent-[var(--neu-accent)]"
              />
            </span>
            暂不加密（仅本机信任环境）
          </label>
        )}

        {(mode === 'unlock' || !skipEncrypt) && (
          <div className="mt-5 space-y-3">
            <input
              type="password"
              className="neu-field"
              placeholder="主密码"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit();
              }}
            />
            {mode === 'setup' && (
              <input
                type="password"
                className="neu-field"
                placeholder="确认主密码"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit();
                }}
              />
            )}
          </div>
        )}

        {(localError || error) && (
          <p className="mt-3 text-sm text-[var(--neu-danger)]">{localError || error}</p>
        )}

        <button
          type="button"
          className="neu-btn neu-btn-primary mt-6 w-full"
          disabled={busy}
          onClick={() => void submit()}
        >
          {mode === 'setup' ? '进入 KeyLedger' : '解锁'}
        </button>
      </motion.div>
    </div>
  );
}

function DetailPane({
  entry,
  revealSecrets,
  copied,
  onToggleReveal,
  onCopy,
  onEdit,
  onDelete,
}: {
  entry: KeyEntry;
  revealSecrets: boolean;
  copied: string | null;
  onToggleReveal: () => void;
  onCopy: (text: string, token: string) => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const preset = getPreset(entry.providerId);
  const [templateId, setTemplateId] = useState(preset.configTemplates[0]?.id ?? 'env');

  useEffect(() => {
    setTemplateId(getPreset(entry.providerId).configTemplates[0]?.id ?? 'env');
  }, [entry.id, entry.providerId]);

  const template =
    preset.configTemplates.find((t) => t.id === templateId) ?? preset.configTemplates[0];
  const rendered = template ? renderTemplate(template.body, entry.values) : '';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            {entry.title}
          </h2>
          <p className="mt-1 text-xs text-[var(--neu-muted)]">
            {preset.name} · 更新于 {new Date(entry.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="neu-btn neu-btn-icon" onClick={onEdit} aria-label="编辑">
            <Pencil className="size-4" />
          </button>
          <button type="button" className="neu-btn neu-btn-icon" onClick={onDelete} aria-label="删除">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {preset.fields.map((field) => {
          const value = entry.values[field.key] ?? '';
          const display = field.secret && !revealSecrets ? mask(value) : value || '—';
          return (
            <div key={field.key} className="neu-well flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-wide text-[var(--neu-muted)] uppercase">
                  {field.label}
                </p>
                <p className="truncate font-mono text-sm">{display}</p>
              </div>
              <button
                type="button"
                className="neu-btn neu-btn-icon !size-11 !min-h-11"
                onClick={() => void onCopy(value, `field-${field.key}`)}
                aria-label="复制"
              >
                {copied === `field-${field.key}` ? (
                  <Check className="size-3.5 text-[var(--neu-success)]" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 text-xs text-[var(--neu-muted)] hover:text-[var(--neu-fg)]"
          onClick={onToggleReveal}
        >
          {revealSecrets ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {revealSecrets ? '隐藏密钥' : '显示密钥'}
        </button>
        {preset.docsUrl && (
          <a
            href={preset.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-[var(--neu-accent)] underline-offset-2 hover:underline"
          >
            官方文档
          </a>
        )}
      </div>

      {entry.notes && <p className="neu-well px-4 py-3 text-sm leading-relaxed">{entry.notes}</p>}

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-wide text-[var(--neu-muted)] uppercase">
            配置格式
          </p>
          <select
            className="neu-field !py-2 text-xs md:w-36"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            {preset.configTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <pre className="neu-code">{rendered}</pre>
        <button
          type="button"
          className="neu-btn mt-3 w-full"
          onClick={() => void onCopy(rendered, 'template')}
        >
          {copied === 'template' ? <Check className="size-4 text-[var(--neu-success)]" /> : <Copy className="size-4" />}
          复制配置片段
        </button>
      </div>
    </div>
  );
}

function EditorModal({
  entry,
  onChange,
  onClose,
  onSave,
}: {
  entry: KeyEntry;
  onChange: (entry: KeyEntry) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const preset = getPreset(entry.providerId);

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-end bg-[rgb(61_72_82/0.28)] p-0 backdrop-blur-[2px] md:place-items-center md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="neu-card max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[32px] p-6 md:rounded-[32px] md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-2xl font-extrabold tracking-tight">编辑记录</h3>
          <button type="button" className="neu-btn neu-btn-icon" onClick={onClose} aria-label="关闭">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block space-y-2 text-sm">
            <span className="text-[var(--neu-muted)]">提供商</span>
            <select
              className="neu-field"
              value={entry.providerId}
              onChange={(e) => {
                const providerId = e.target.value as AiProviderId;
                onChange({
                  ...entry,
                  providerId,
                  values: { ...emptyValues(providerId), ...entry.values },
                });
              }}
            >
              {PROVIDER_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-[var(--neu-muted)]">标题</span>
            <input
              className="neu-field"
              value={entry.title}
              onChange={(e) => onChange({ ...entry, title: e.target.value })}
            />
          </label>

          {preset.fields.map((field) => (
            <label key={field.key} className="block space-y-2 text-sm">
              <span className="text-[var(--neu-muted)]">{field.label}</span>
              {field.multiline ? (
                <textarea
                  className="neu-field min-h-24"
                  placeholder={field.placeholder}
                  value={entry.values[field.key] ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...entry,
                      values: { ...entry.values, [field.key]: e.target.value },
                    })
                  }
                />
              ) : (
                <input
                  className="neu-field"
                  type={field.secret ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={entry.values[field.key] ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...entry,
                      values: { ...entry.values, [field.key]: e.target.value },
                    })
                  }
                />
              )}
            </label>
          ))}

          <label className="block space-y-2 text-sm">
            <span className="text-[var(--neu-muted)]">标签（逗号分隔）</span>
            <input
              className="neu-field"
              placeholder="生产, 代理, 备用"
              value={entry.tags.join(', ')}
              onChange={(e) =>
                onChange({
                  ...entry,
                  tags: e.target.value.split(',').map((t) => t.trim()),
                })
              }
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-[var(--neu-muted)]">备注</span>
            <textarea
              className="neu-field min-h-20"
              value={entry.notes}
              onChange={(e) => onChange({ ...entry, notes: e.target.value })}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="neu-btn" onClick={onClose}>
            取消
          </button>
          <button type="button" className="neu-btn neu-btn-primary" onClick={onSave}>
            保存
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
