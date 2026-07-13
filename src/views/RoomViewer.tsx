import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, MonitorSmartphone, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cacheRoomSnapshot, loadCachedRoom, loadSettings } from '@/src/lib/storage';
import { playUpdateChime } from '@/src/lib/sound';
import { fetchRoom, subscribeRoom } from '@/src/lib/sync';
import type { RoomSnapshot } from '@/src/types';
import Prompter from './Prompter';

type LoadState = 'loading' | 'ready' | 'not_found' | 'offline_cache';

export default function RoomViewer({ roomId, navigate }: { roomId: string; navigate: (hash: string) => void }) {
  const [state, setState] = useState<LoadState>('loading');
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [pending, setPending] = useState<RoomSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [viewers, setViewers] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  const playingRef = useRef(false);
  const snapshotRef = useRef<RoomSnapshot | null>(null);
  snapshotRef.current = snapshot;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 3000);
  }, []);

  const applySnapshot = useCallback((snap: RoomSnapshot) => {
    setSnapshot(snap);
    setPending(null);
    cacheRoomSnapshot(snap);
  }, []);

  const handleRemoteUpdate = useCallback(
    (snap: RoomSnapshot) => {
      const current = snapshotRef.current;
      if (current && snap.version <= current.version) return;
      const isFirst = !current;
      if (!isFirst && loadSettings().sound) playUpdateChime();

      if (!isFirst && playingRef.current) {
        // 播放中不打断朗读，挂起等待手动应用
        setPending(snap);
        cacheRoomSnapshot(snap);
      } else {
        applySnapshot(snap);
        if (!isFirst) showToast(`内容已更新到 v${snap.version}`);
      }
      setState('ready');
    },
    [applySnapshot, showToast],
  );

  // 初始加载：先拉快照，失败时回退到本地缓存
  useEffect(() => {
    let cancelled = false;
    fetchRoom(roomId)
      .then((snap) => {
        if (cancelled) return;
        applySnapshot(snap);
        if (typeof snap.viewers === 'number') setViewers(snap.viewers);
        setState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof Error && err.message === 'room_not_found') {
          setState('not_found');
          return;
        }
        const cached = loadCachedRoom(roomId);
        if (cached) {
          setSnapshot(cached);
          setState('offline_cache');
        } else {
          setState('not_found');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, applySnapshot]);

  // SSE 订阅：内容更新 + 在线人数 + 连接状态
  useEffect(() => {
    const sub = subscribeRoom(roomId, {
      onUpdate: handleRemoteUpdate,
      onPresence: (n) => setViewers(n),
      onConnectionChange: setConnected,
    });
    return () => sub.close();
  }, [roomId, handleRemoteUpdate]);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  if (state === 'loading') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-white/50 text-sm">正在加入房间 {roomId}…</p>
      </div>
    );
  }

  if (state === 'not_found' || !snapshot) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <WifiOff className="w-10 h-10 text-white/30" />
        <p className="text-white/70">无法加入房间 <span className="font-mono">{roomId}</span></p>
        <p className="text-white/40 text-sm">房间不存在、已失效，或当前网络不可用且本机没有缓存</p>
        <Button variant="outline" className="border-white/15 bg-white/5 text-white/70 hover:bg-white/10" onClick={() => navigate('#/')}>
          返回首页
        </Button>
      </div>
    );
  }

  const statusExtra = (
    <span className="flex items-center gap-2 text-xs">
      {connected ? (
        <span className="flex items-center gap-1 text-emerald-400">
          <Wifi className="w-3.5 h-3.5" />
          已连接
        </span>
      ) : (
        <span className="flex items-center gap-1 text-amber-400">
          <WifiOff className="w-3.5 h-3.5" />
          {state === 'offline_cache' ? '离线缓存' : '重连中…'}
        </span>
      )}
      {viewers !== null && (
        <span className="flex items-center gap-1 text-white/50">
          <MonitorSmartphone className="w-3.5 h-3.5" />
          {viewers}
        </span>
      )}
      <span className="text-white/35 font-mono">v{snapshot.version}</span>
    </span>
  );

  const notice = (
    <>
      {/* 播放中收到更新：顶部横幅，读完再应用或立即应用 */}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-amber-400 text-black rounded-full pl-4 pr-2 py-1.5 shadow-2xl"
          >
            <span className="text-sm font-medium whitespace-nowrap">收到新内容 v{pending.version}</span>
            <Button size="sm" className="bg-black text-white hover:bg-black/80 rounded-full" onClick={() => applySnapshot(pending)}>
              立即应用
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && !pending && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-[60] bg-emerald-500 text-black rounded-full px-4 py-1.5 text-sm font-medium shadow-2xl whitespace-nowrap"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <Prompter
      key={`${snapshot.id}-${snapshot.version}`}
      title={snapshot.title}
      content={snapshot.content}
      onExit={() => navigate('#/')}
      statusExtra={statusExtra}
      notice={notice}
      onPlayingChange={(playing) => {
        playingRef.current = playing;
        // 暂停时若有挂起的更新，自动应用
        if (!playing) {
          setPending((p) => {
            if (p) {
              setSnapshot(p);
              cacheRoomSnapshot(p);
              showToast(`内容已更新到 v${p.version}`);
              return null;
            }
            return p;
          });
        }
      }}
    />
  );
}
