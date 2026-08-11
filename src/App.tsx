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
import { Button } from '@/components/ui/button';

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
      <div className="app-shell grid min-h-dvh place-items-center">
        <p className="font-mono text-sm text-[var(--ink-soft)]">载入保险库…</p>
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
    <div className="app-shell min-h-dvh text-[var(--ink)]">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-6 md:px-8 md:py-10">
        <header className="mb-8 flex flex-col gap-6 md:mb-10 md:flex-row md:items-end md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <p className="font-display text-4xl tracking-tight md:text-5xl">KeyLedger</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--ink-soft)]">
              本地记录各 AI 工具的 API Key 与配置格式。数据只存在浏览器，可选用主密码加密。
            </p>
          </motion.div>
          <motion.div
            className="flex flex-wrap items-center gap-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Button onClick={() => openCreate()} className="h-10 gap-2 px-4">
              <Plus className="size-4" />
              新建记录
            </Button>
            <Button variant="outline" className="h-10 gap-2 px-3" onClick={onExport}>
              <Download className="size-4" />
              导出
            </Button>
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
              <span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-sm hover:bg-[var(--panel-strong)]">
                <Upload className="size-4" />
                导入
              </span>
            </label>
            {vault.encrypted && (
              <Button variant="ghost" className="h-10 gap-2 px-3" onClick={vault.lock}>
                <Lock className="size-4" />
                锁定
              </Button>
            )}
          </motion.div>
        </header>

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--ink-soft)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索标题、标签、备注或密钥片段"
              className="field w-full pl-10"
            />
          </div>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value as AiProviderId | 'all')}
            className="field md:w-48"
          >
            <option value="all">全部提供商</option>
            {PROVIDER_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {PROVIDER_PRESETS.map((p, i) => (
            <motion.button
              key={p.id}
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i }}
              onClick={() => openCreate(p.id)}
              className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
            >
              + {p.name}
            </motion.button>
          ))}
        </div>

        <div className="grid flex-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-3">
            {filtered.length === 0 ? (
              <div className="panel grid min-h-64 place-items-center p-8 text-center">
                <div>
                  <KeyRound className="mx-auto mb-3 size-8 text-[var(--accent)]" />
                  <p className="font-display text-xl">还没有密钥记录</p>
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">
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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.24) }}
                    onClick={() => setSelectedId(entry.id)}
                    className={cn(
                      'panel w-full p-4 text-left transition',
                      active && 'ring-2 ring-[var(--accent)]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{entry.title}</p>
                        <p className="mt-1 font-mono text-xs text-[var(--ink-soft)]">
                          {preset.vendor} · {mask(entry.values.apiKey ?? '')}
                        </p>
                      </div>
                      <span className="rounded bg-[var(--chip)] px-2 py-0.5 text-[10px] tracking-wide uppercase">
                        {preset.name}
                      </span>
                    </div>
                    {entry.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded border border-[var(--line)] px-1.5 py-0.5 text-[10px] text-[var(--ink-soft)]"
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

          <aside className="panel sticky top-4 h-fit min-h-72 p-5">
            {!selected ? (
              <div className="grid min-h-56 place-items-center text-center text-sm text-[var(--ink-soft)]">
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

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4 text-xs text-[var(--ink-soft)]">
          <span className="inline-flex items-center gap-1.5">
            <Shield className="size-3.5" />
            {vault.encrypted ? 'AES-GCM 加密本地存储' : '明文本地存储（可重建并启用主密码）'}
          </span>
          <button
            type="button"
            className="underline-offset-2 hover:underline"
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
    <div className="app-shell grid min-h-dvh place-items-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel w-full max-w-md p-7"
      >
        <p className="font-display text-3xl">KeyLedger</p>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          {mode === 'setup'
            ? '首次使用：可选设置主密码，密钥将 AES-GCM 加密后写入 localStorage。'
            : '保险库已锁定，输入主密码解锁。'}
        </p>

        {mode === 'setup' && (
          <label className="mt-5 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={skipEncrypt}
              onChange={(e) => setSkipEncrypt(e.target.checked)}
            />
            暂不加密（仅本机信任环境）
          </label>
        )}

        {(mode === 'unlock' || !skipEncrypt) && (
          <div className="mt-4 space-y-3">
            <input
              type="password"
              className="field w-full"
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
                className="field w-full"
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
          <p className="mt-3 text-sm text-[var(--danger)]">{localError || error}</p>
        )}

        <Button className="mt-5 h-10 w-full" disabled={busy} onClick={() => void submit()}>
          {mode === 'setup' ? '进入 KeyLedger' : '解锁'}
        </Button>
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
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">{entry.title}</h2>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            {preset.name} · 更新于 {new Date(entry.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="编辑">
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="删除">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {preset.fields.map((field) => {
          const value = entry.values[field.key] ?? '';
          const display = field.secret && !revealSecrets ? mask(value) : value || '—';
          return (
            <div
              key={field.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel-strong)] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-[10px] tracking-wide text-[var(--ink-soft)] uppercase">
                  {field.label}
                </p>
                <p className="truncate font-mono text-sm">{display}</p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void onCopy(value, `field-${field.key}`)}
                aria-label="复制"
              >
                {copied === `field-${field.key}` ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-soft)] hover:text-[var(--ink)]"
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
            className="text-xs text-[var(--accent-ink)] underline-offset-2 hover:underline"
          >
            官方文档
          </a>
        )}
      </div>

      {entry.notes && (
        <p className="rounded-lg bg-[var(--chip)] px-3 py-2 text-sm leading-relaxed">{entry.notes}</p>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs tracking-wide text-[var(--ink-soft)] uppercase">配置格式</p>
          <select
            className="field h-8 py-1 text-xs"
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
        <pre className="code-block relative whitespace-pre-wrap">{rendered}</pre>
        <Button
          variant="outline"
          className="mt-2 h-9 gap-2"
          onClick={() => void onCopy(rendered, 'template')}
        >
          {copied === 'template' ? <Check className="size-4" /> : <Copy className="size-4" />}
          复制配置片段
        </Button>
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
      className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-0 backdrop-blur-sm md:place-items-center md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className="panel max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl p-5 md:rounded-2xl md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-2xl">编辑记录</h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭">
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1.5 text-sm">
            <span>提供商</span>
            <select
              className="field w-full"
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

          <label className="block space-y-1.5 text-sm">
            <span>标题</span>
            <input
              className="field w-full"
              value={entry.title}
              onChange={(e) => onChange({ ...entry, title: e.target.value })}
            />
          </label>

          {preset.fields.map((field) => (
            <label key={field.key} className="block space-y-1.5 text-sm">
              <span>{field.label}</span>
              {field.multiline ? (
                <textarea
                  className="field min-h-24 w-full"
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
                  className="field w-full"
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

          <label className="block space-y-1.5 text-sm">
            <span>标签（逗号分隔）</span>
            <input
              className="field w-full"
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

          <label className="block space-y-1.5 text-sm">
            <span>备注</span>
            <textarea
              className="field min-h-20 w-full"
              value={entry.notes}
              onChange={(e) => onChange({ ...entry, notes: e.target.value })}
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onSave}>保存</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
