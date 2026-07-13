import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Loader2,
  MonitorSmartphone,
  Play,
  Radio,
  RefreshCw,
  Unlink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/src/lib/utils';
import { getScript, upsertScript } from '@/src/lib/storage';
import { playSyncOk } from '@/src/lib/sound';
import { createRoom, pushRoom, roomShareUrl, subscribeRoom } from '@/src/lib/sync';
import {
  contentHash,
  countWords,
  estimateDuration,
  formatDuration,
  type Script,
} from '@/src/types';

type SyncPhase = 'idle' | 'syncing' | 'done' | 'error';

export default function Editor({ scriptId, navigate }: { scriptId: string; navigate: (hash: string) => void }) {
  const [script, setScript] = useState<Script | null>(() => getScript(scriptId) ?? null);
  const [syncPhase, setSyncPhase] = useState<SyncPhase>('idle');
  const [syncError, setSyncError] = useState('');
  const [creating, setCreating] = useState(false);
  const [viewers, setViewers] = useState<number | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const scriptRef = useRef(script);
  scriptRef.current = script;

  const save = useCallback((next: Script) => {
    next.updatedAt = Date.now();
    setScript({ ...next });
    upsertScript(next);
  }, []);

  const wordCount = useMemo(() => countWords(script?.content ?? ''), [script?.content]);
  const duration = useMemo(() => estimateDuration(script?.content ?? ''), [script?.content]);

  const dirty = useMemo(() => {
    if (!script?.room) return false;
    return contentHash(script.title, script.content) !== script.room.lastSyncedHash;
  }, [script]);

  // 编辑端也保持一条 SSE 连接：实时显示在线设备数
  useEffect(() => {
    const roomId = script?.room?.roomId;
    if (!roomId) return;
    const sub = subscribeRoom(roomId, {
      onUpdate: () => undefined,
      onPresence: (n) => setViewers(n),
    });
    return () => sub.close();
  }, [script?.room?.roomId]);

  // 生成分享二维码
  useEffect(() => {
    const roomId = script?.room?.roomId;
    if (!roomId) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(roomShareUrl(roomId), { width: 320, margin: 1, color: { dark: '#ffffff', light: '#00000000' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [script?.room?.roomId]);

  if (!script) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <p className="text-white/50">文稿不存在或已删除</p>
        <Button variant="outline" className="border-white/10 text-white/70" onClick={() => navigate('#/')}>
          返回列表
        </Button>
      </div>
    );
  }

  const handleCreateRoom = async () => {
    setCreating(true);
    setSyncError('');
    try {
      const result = await createRoom(script.title, script.content);
      save({
        ...script,
        room: {
          roomId: result.id,
          editKey: result.editKey,
          lastSyncedVersion: result.version,
          lastSyncedHash: contentHash(script.title, script.content),
          lastSyncedAt: Date.now(),
        },
      });
    } catch (err) {
      setSyncError(`创建房间失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCreating(false);
    }
  };

  const handleSync = async () => {
    const current = scriptRef.current;
    if (!current?.room || syncPhase === 'syncing') return;
    setSyncPhase('syncing');
    setSyncError('');
    try {
      const result = await pushRoom(current.room.roomId, current.room.editKey, {
        title: current.title,
        content: current.content,
        baseVersion: current.room.lastSyncedVersion,
      });
      save({
        ...current,
        room: {
          ...current.room,
          lastSyncedVersion: result.version,
          lastSyncedHash: contentHash(current.title, current.content),
          lastSyncedAt: Date.now(),
        },
      });
      if (typeof result.viewers === 'number') setViewers(result.viewers);
      setSyncPhase('done');
      playSyncOk();
      if (result.conflict) {
        setSyncError('提示：服务器上存在其他编辑端推送的版本，已被本次同步覆盖');
      }
      setTimeout(() => setSyncPhase('idle'), 2000);
    } catch (err) {
      setSyncPhase('error');
      const msg = err instanceof Error ? err.message : String(err);
      setSyncError(
        msg === 'room_not_found'
          ? '房间已失效，请解除共享后重新创建'
          : msg === 'invalid_edit_key'
            ? '编辑密钥无效，无法推送'
            : `同步失败：${msg}`,
      );
    }
  };

  const handleUnlink = () => {
    if (!confirm('解除共享后，本机将不能再向该房间推送内容。确定解除？')) return;
    const { room: _room, ...rest } = script;
    save({ ...rest });
    setViewers(null);
  };

  const copyLink = async () => {
    if (!script.room) return;
    try {
      await navigator.clipboard.writeText(roomShareUrl(script.room.roomId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      prompt('复制以下链接：', roomShareUrl(script.room.roomId));
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-zinc-950 custom-scrollbar">
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4 min-h-full">
        {/* 顶部栏 */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/60 hover:text-white hover:bg-white/10 shrink-0"
            onClick={() => navigate('#/')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <input
            value={script.title}
            onChange={(e) => save({ ...script, title: e.target.value })}
            placeholder="文稿标题…"
            className="flex-1 bg-transparent text-white text-lg font-bold placeholder:text-white/25 outline-none min-w-0"
          />
          <Button className="bg-emerald-500 text-black hover:bg-emerald-400 shrink-0" onClick={() => navigate(`#/play/${script.id}`)}>
            <Play className="w-4 h-4" data-icon="inline-start" />
            开始提词
          </Button>
        </div>

        {/* 正文编辑 */}
        <textarea
          value={script.content}
          onChange={(e) => save({ ...script, content: e.target.value })}
          placeholder="在这里粘贴或输入提词内容，空行分段…"
          className="flex-1 min-h-[40vh] w-full resize-none rounded-xl bg-white/5 border border-white/10 p-4 text-white/90 text-base leading-relaxed placeholder:text-white/25 outline-none focus:border-emerald-500/50 custom-scrollbar"
        />

        <div className="flex items-center gap-4 text-white/35 text-xs">
          <span>{wordCount} 字</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            预计朗读约 {formatDuration(duration)}
          </span>
          <span className="ml-auto">修改自动保存到本机</span>
        </div>

        {/* 云端共享面板 */}
        <Card className="bg-white/5 border-white/10 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Radio className={cn('w-4 h-4', script.room ? 'text-emerald-400' : 'text-white/40')} />
            <span className="text-white font-medium text-sm">云端共享</span>
            {script.room && (
              <span className="text-white/40 text-xs font-mono">房间号 {script.room.roomId}</span>
            )}
            {script.room && viewers !== null && (
              <span className="ml-auto flex items-center gap-1 text-emerald-400/90 text-xs">
                <MonitorSmartphone className="w-3.5 h-3.5" />
                {viewers} 台设备在线
              </span>
            )}
          </div>

          {!script.room ? (
            <>
              <p className="text-white/40 text-xs leading-relaxed">
                创建共享房间后，会生成一个链接和二维码。现场任何设备打开链接即可实时看到这份文稿；你在这里改完点「同步」，所有设备立刻更新，无需来回拷贝。
              </p>
              <Button
                className="bg-emerald-500 text-black hover:bg-emerald-400 self-start"
                onClick={handleCreateRoom}
                disabled={creating}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" data-icon="inline-start" /> : <Radio className="w-4 h-4" data-icon="inline-start" />}
                创建共享房间
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-4">
                {qrDataUrl && (
                  <div className="shrink-0 self-center sm:self-start rounded-lg bg-white/5 border border-white/10 p-2">
                    <img src={qrDataUrl} alt="房间二维码" className="w-36 h-36" />
                  </div>
                )}
                <div className="flex-1 flex flex-col gap-3 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate text-emerald-300/90 text-xs bg-black/40 rounded-lg px-3 py-2 border border-white/10">
                      {roomShareUrl(script.room.roomId)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/60 hover:text-white hover:bg-white/10 shrink-0"
                      onClick={copyLink}
                      title="复制链接"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      className={cn(
                        'shrink-0',
                        dirty
                          ? 'bg-amber-400 text-black hover:bg-amber-300'
                          : 'bg-white/10 text-white hover:bg-white/20',
                      )}
                      onClick={handleSync}
                      disabled={syncPhase === 'syncing'}
                    >
                      {syncPhase === 'syncing' ? (
                        <Loader2 className="w-4 h-4 animate-spin" data-icon="inline-start" />
                      ) : syncPhase === 'done' ? (
                        <Check className="w-4 h-4" data-icon="inline-start" />
                      ) : (
                        <RefreshCw className="w-4 h-4" data-icon="inline-start" />
                      )}
                      {syncPhase === 'syncing' ? '同步中…' : syncPhase === 'done' ? '已同步' : '同步到所有设备'}
                    </Button>
                    <span
                      className={cn(
                        'text-xs',
                        dirty ? 'text-amber-400' : 'text-white/40',
                      )}
                    >
                      {dirty
                        ? '有未同步的修改'
                        : `已同步 v${script.room.lastSyncedVersion} · ${new Date(script.room.lastSyncedAt).toLocaleTimeString()}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-white/40 hover:text-red-400 hover:bg-red-500/10"
                      onClick={handleUnlink}
                    >
                      <Unlink className="w-3.5 h-3.5" data-icon="inline-start" />
                      解除共享
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {syncError && (
            <p className="flex items-center gap-1.5 text-amber-400 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {syncError}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
