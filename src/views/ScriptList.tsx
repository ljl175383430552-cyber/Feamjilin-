import React, { useRef, useState } from 'react';
import { Clock, FileText, Play, Plus, Radio, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { deleteScript, loadScripts, newScriptId, upsertScript } from '@/src/lib/storage';
import { countWords, estimateDuration, formatDuration, type Script } from '@/src/types';

export default function ScriptList({ navigate }: { navigate: (hash: string) => void }) {
  const [scripts, setScripts] = useState<Script[]>(() => loadScripts());
  const fileRef = useRef<HTMLInputElement>(null);

  const createScript = () => {
    const now = Date.now();
    const script: Script = { id: newScriptId(), title: '', content: '', createdAt: now, updatedAt: now };
    upsertScript(script);
    navigate(`#/edit/${script.id}`);
  };

  const removeScript = (id: string, title: string) => {
    if (!confirm(`确定删除文稿「${title || '未命名文稿'}」吗？`)) return;
    deleteScript(id);
    setScripts(loadScripts());
  };

  const importFile = async (file: File) => {
    const text = await file.text();
    const now = Date.now();
    const script: Script = {
      id: newScriptId(),
      title: file.name.replace(/\.(txt|md)$/i, ''),
      content: text,
      createdAt: now,
      updatedAt: now,
    };
    upsertScript(script);
    setScripts(loadScripts());
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-zinc-950 custom-scrollbar">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">提词器</h1>
            <p className="text-white/40 text-sm mt-1">文稿本地保存 · 支持多端云同步</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-4 h-4" data-icon="inline-start" />
              导入
            </Button>
            <Button className="bg-emerald-500 text-black hover:bg-emerald-400" onClick={createScript}>
              <Plus className="w-4 h-4" data-icon="inline-start" />
              新建文稿
            </Button>
          </div>
        </header>

        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importFile(file);
            e.target.value = '';
          }}
        />

        {/* 观看端入口：粘贴/输入房间号即可加入 */}
        <JoinRoomCard navigate={navigate} />

        {scripts.length === 0 ? (
          <Card className="bg-white/5 border-white/10 p-10 flex flex-col items-center gap-3 text-center">
            <FileText className="w-10 h-10 text-white/20" />
            <p className="text-white/50 text-sm">还没有文稿，点击「新建文稿」开始，或导入 .txt / .md 文件</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {scripts.map((s) => {
              const secs = estimateDuration(s.content);
              return (
                <Card
                  key={s.id}
                  className="bg-white/5 border-white/10 p-4 hover:bg-white/[0.08] transition-colors cursor-pointer"
                  onClick={() => navigate(`#/edit/${s.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-white font-medium truncate">{s.title || '未命名文稿'}</h2>
                        {s.room && (
                          <span className="flex items-center gap-1 text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                            <Radio className="w-3 h-3" />
                            已共享
                          </span>
                        )}
                      </div>
                      <p className="text-white/40 text-xs mt-1 truncate">{s.content.slice(0, 80) || '（空白）'}</p>
                      <div className="flex items-center gap-3 mt-2 text-white/30 text-[11px]">
                        <span>{countWords(s.content)} 字</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />约 {formatDuration(secs)}
                        </span>
                        <span>{new Date(s.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      className="bg-white/10 text-white hover:bg-emerald-500 hover:text-black shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`#/play/${s.id}`);
                      }}
                      title="开始提词"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/30 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeScript(s.id, s.title);
                      }}
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function JoinRoomCard({ navigate }: { navigate: (hash: string) => void }) {
  const [value, setValue] = useState('');

  const join = () => {
    const input = value.trim();
    if (!input) return;
    // 支持直接粘贴完整分享链接
    const match = input.match(/#\/room\/([a-zA-Z0-9]+)/);
    const roomId = match ? match[1] : input;
    navigate(`#/room/${roomId}`);
  };

  return (
    <Card className="bg-white/5 border-white/10 p-4">
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          placeholder="输入房间号或粘贴分享链接，加入共享提词…"
          className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 outline-none min-w-0"
        />
        <Button
          size="sm"
          className="bg-white/10 text-white hover:bg-emerald-500 hover:text-black shrink-0"
          onClick={join}
        >
          加入
        </Button>
      </div>
    </Card>
  );
}
