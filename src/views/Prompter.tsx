import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  FlipHorizontal2,
  FlipVertical2,
  Gauge,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/src/lib/utils';
import { loadSettings, saveSettings } from '@/src/lib/storage';
import { playFinish, playTick } from '@/src/lib/sound';
import { estimateDuration, formatDuration, THEMES, type PrompterSettings } from '@/src/types';

interface PrompterProps {
  title: string;
  content: string;
  onExit: () => void;
  /** 顶部状态区扩展（房间模式显示连接状态/在线人数） */
  statusExtra?: React.ReactNode;
  /** 覆盖层通知（房间模式的“内容已更新”横幅） */
  notice?: React.ReactNode;
  onPlayingChange?: (playing: boolean) => void;
}

/** 焦点参考线位于视口高度的比例 */
const FOCUS_RATIO = 0.32;

export default function Prompter({ title, content, onExit, statusExtra, notice, onPlayingChange }: PrompterProps) {
  const [settings, setSettings] = useState<PrompterSettings>(() => loadSettings());
  const [playing, setPlaying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const playingRef = useRef(false);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const theme = THEMES.find((t) => t.id === settings.theme) ?? THEMES[0];
  const paragraphs = useMemo(() => content.split(/\n/), [content]);
  const totalSeconds = useMemo(() => estimateDuration(content), [content]);

  const updateSettings = useCallback((patch: Partial<PrompterSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const setPlayingBoth = useCallback(
    (value: boolean) => {
      playingRef.current = value;
      setPlaying(value);
      onPlayingChange?.(value);
    },
    [onPlayingChange],
  );

  // ---------- 滚动引擎（rAF 驱动，可实时变速） ----------

  useEffect(() => {
    const step = (ts: number) => {
      rafRef.current = requestAnimationFrame(step);
      const el = scrollRef.current;
      if (!el) return;

      const dt = lastTsRef.current ? Math.min((ts - lastTsRef.current) / 1000, 0.1) : 0;
      lastTsRef.current = ts;

      const maxScroll = el.scrollHeight - el.clientHeight;
      // 用户手动滚动（触摸/滚轮）时，跟随实际位置
      if (Math.abs(el.scrollTop - posRef.current) > 2) {
        posRef.current = el.scrollTop;
      }

      if (playingRef.current) {
        posRef.current = Math.min(posRef.current + settingsRef.current.speed * dt, maxScroll);
        el.scrollTop = posRef.current;
        setElapsed((prev) => prev + dt);
        if (posRef.current >= maxScroll - 0.5) {
          playingRef.current = false;
          setPlaying(false);
          onPlayingChange?.(false);
          if (settingsRef.current.sound) playFinish();
        }
      }
      setProgress(maxScroll > 0 ? el.scrollTop / maxScroll : 0);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onPlayingChange]);

  // ---------- 播放控制 ----------

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  }, []);

  const startPlay = useCallback(() => {
    const secs = settingsRef.current.countdown;
    if (secs <= 0) {
      setPlayingBoth(true);
      return;
    }
    let remain = secs;
    setCountdown(remain);
    if (settingsRef.current.sound) playTick();
    countdownTimerRef.current = setInterval(() => {
      remain -= 1;
      if (remain <= 0) {
        cancelCountdown();
        setPlayingBoth(true);
      } else {
        setCountdown(remain);
        if (settingsRef.current.sound) playTick();
      }
    }, 1000);
  }, [cancelCountdown, setPlayingBoth]);

  const togglePlay = useCallback(() => {
    if (countdownTimerRef.current) {
      cancelCountdown();
      return;
    }
    if (playingRef.current) {
      setPlayingBoth(false);
    } else {
      startPlay();
    }
  }, [cancelCountdown, setPlayingBoth, startPlay]);

  const resetToTop = useCallback(() => {
    cancelCountdown();
    setPlayingBoth(false);
    posRef.current = 0;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setElapsed(0);
  }, [cancelCountdown, setPlayingBoth]);

  const jumpBy = useCallback((px: number) => {
    const el = scrollRef.current;
    if (!el) return;
    posRef.current = Math.max(0, Math.min(posRef.current + px, el.scrollHeight - el.clientHeight));
    el.scrollTop = posRef.current;
  }, []);

  const jumpToParagraph = useCallback((e: React.MouseEvent<HTMLParagraphElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    const target = e.currentTarget;
    posRef.current = Math.max(0, target.offsetTop - el.clientHeight * FOCUS_RATIO);
    el.scrollTop = posRef.current;
  }, []);

  // ---------- 全屏 ----------

  const toggleFullscreen = useCallback(() => {
    const doc = document as any;
    const el = rootRef.current as any;
    const isFS = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (!isFS && el) {
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    } else {
      (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
    }
  }, []);

  useEffect(() => {
    const onChange = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  // ---------- 控制栏自动隐藏 ----------

  const pokeControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (playingRef.current) setControlsVisible(false);
    }, 3000);
  }, []);

  useEffect(() => {
    if (playing) pokeControls();
    else setControlsVisible(true);
  }, [playing, pokeControls]);

  useEffect(
    () => () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    },
    [],
  );

  // ---------- 快捷键 ----------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowUp':
          e.preventDefault();
          updateSettings({ speed: Math.min(settingsRef.current.speed + 5, 300) });
          break;
        case 'ArrowDown':
          e.preventDefault();
          updateSettings({ speed: Math.max(settingsRef.current.speed - 5, 5) });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          jumpBy(-window.innerHeight * 0.5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          jumpBy(window.innerHeight * 0.5);
          break;
        case 'KeyR':
          resetToTop();
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'KeyM':
          updateSettings({ mirrorH: !settingsRef.current.mirrorH });
          break;
        case 'Escape':
          if (showSettings) setShowSettings(false);
          break;
      }
      pokeControls();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, jumpBy, resetToTop, toggleFullscreen, updateSettings, pokeControls, showSettings]);

  const remaining = settings.speed > 0 && scrollRef.current
    ? Math.max(0, (scrollRef.current.scrollHeight - scrollRef.current.clientHeight) * (1 - progress)) / settings.speed
    : 0;

  const mirrorTransform = `${settings.mirrorH ? 'scaleX(-1) ' : ''}${settings.mirrorV ? 'scaleY(-1)' : ''}`.trim();

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 overflow-hidden select-none"
      style={{ backgroundColor: theme.bg }}
      onPointerMove={pokeControls}
      onPointerDown={pokeControls}
    >
      {/* 顶部进度条 */}
      <div className="absolute top-0 left-0 right-0 h-1 z-40 bg-white/10">
        <div className="h-full bg-emerald-500 transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* 滚动文本区（镜像只作用于文本） */}
      <div className="absolute inset-0" style={{ transform: mirrorTransform || undefined }}>
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto custom-scrollbar"
          style={{
            paddingLeft: `${settings.marginX}%`,
            paddingRight: `${settings.marginX}%`,
            scrollbarWidth: 'none',
          }}
        >
          <div style={{ height: `${FOCUS_RATIO * 100}vh` }} />
          <div
            style={{
              fontSize: settings.fontSize,
              lineHeight: settings.lineHeight,
              color: theme.fg,
              fontWeight: 600,
            }}
          >
            {paragraphs.map((p, i) =>
              p.trim() === '' ? (
                <div key={i} style={{ height: `${settings.fontSize * 0.8}px` }} />
              ) : (
                <p key={i} className="cursor-pointer transition-opacity hover:opacity-80" onClick={jumpToParagraph}>
                  {p}
                </p>
              ),
            )}
          </div>
          <div style={{ height: '70vh' }} />
        </div>

        {/* 焦点参考线 + 上下遮罩 */}
        {settings.focusLine && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div
              className="absolute left-0 right-0 top-0"
              style={{
                height: `calc(${FOCUS_RATIO * 100}% - ${settings.fontSize * settings.lineHeight * 0.2}px)`,
                background: `linear-gradient(${theme.bg}e6, ${theme.bg}55)`,
              }}
            />
            <div
              className="absolute left-0 right-0 bottom-0"
              style={{
                top: `calc(${FOCUS_RATIO * 100}% + ${settings.fontSize * settings.lineHeight * 1.4}px)`,
                background: `linear-gradient(${theme.bg}22, ${theme.bg}cc)`,
              }}
            />
            <div
              className="absolute left-2 flex items-center"
              style={{ top: `${FOCUS_RATIO * 100}%`, transform: 'translateY(-50%)' }}
            >
              <div className="w-0 h-0 border-y-[7px] border-y-transparent border-l-[12px] border-l-emerald-500" />
            </div>
          </div>
        )}
      </div>

      {/* 倒计时覆盖层 */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={togglePlay}
          >
            <motion.span
              key={countdown}
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-white font-bold"
              style={{ fontSize: 'min(30vw, 200px)' }}
            >
              {countdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 房间模式通知横幅 */}
      {notice}

      {/* 顶部栏 */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="absolute top-1 left-0 right-0 z-40 flex items-center justify-between px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white hover:bg-white/10 shrink-0"
                onClick={onExit}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <span className="text-white/60 text-sm truncate max-w-[40vw]">{title || '未命名文稿'}</span>
            </div>
            <div className="flex items-center gap-3">
              {statusExtra}
              <span className="text-white/50 text-xs font-mono tabular-nums">
                {formatDuration(elapsed)} / 约 {formatDuration(totalSeconds)} · 剩余 {formatDuration(remaining)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部控制栏 */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-2xl"
          >
            <Card className="bg-black/70 backdrop-blur-xl border-white/10 shadow-2xl p-3 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Button
                  size="icon-lg"
                  className="rounded-full bg-emerald-500 text-black hover:bg-emerald-400 shrink-0"
                  onClick={togglePlay}
                >
                  {playing || countdown !== null ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/60 hover:text-white hover:bg-white/10 shrink-0"
                  onClick={resetToTop}
                  title="回到开头 (R)"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <Gauge className="w-4 h-4 text-white/40 shrink-0" />
                  <input
                    type="range"
                    min={5}
                    max={300}
                    step={5}
                    value={settings.speed}
                    onChange={(e) => updateSettings({ speed: Number(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-white/60 text-xs font-mono w-8 text-right shrink-0">{settings.speed}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'shrink-0 hover:bg-white/10',
                    settings.mirrorH ? 'text-emerald-400' : 'text-white/60 hover:text-white',
                  )}
                  onClick={() => updateSettings({ mirrorH: !settings.mirrorH })}
                  title="水平镜像 (M)"
                >
                  <FlipHorizontal2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/60 hover:text-white hover:bg-white/10 shrink-0"
                  onClick={toggleFullscreen}
                  title="全屏 (F)"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/60 hover:text-white hover:bg-white/10 shrink-0"
                  onClick={() => setShowSettings((v) => !v)}
                  title="显示设置"
                >
                  <Settings2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-white/25 text-[10px] text-center hidden sm:block">
                空格 播放/暂停 · ↑↓ 调速 · ←→ 快退/快进 · R 回开头 · F 全屏 · M 镜像 · 点击段落可跳转
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 显示设置面板 */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            className="absolute top-0 right-0 bottom-0 z-50 w-[320px] max-w-[90vw]"
          >
            <Card className="h-full rounded-none bg-black/85 backdrop-blur-xl border-l border-white/10 p-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">显示设置</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => setShowSettings(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <SettingSlider
                label="字号"
                value={settings.fontSize}
                min={20}
                max={120}
                step={2}
                unit="px"
                onChange={(v) => updateSettings({ fontSize: v })}
              />
              <SettingSlider
                label="行距"
                value={settings.lineHeight}
                min={1.2}
                max={2.6}
                step={0.1}
                onChange={(v) => updateSettings({ lineHeight: v })}
              />
              <SettingSlider
                label="左右边距"
                value={settings.marginX}
                min={0}
                max={25}
                step={1}
                unit="%"
                onChange={(v) => updateSettings({ marginX: v })}
              />
              <SettingSlider
                label="倒计时"
                value={settings.countdown}
                min={0}
                max={10}
                step={1}
                unit="秒"
                onChange={(v) => updateSettings({ countdown: v })}
              />

              <div className="space-y-2">
                <span className="text-white/50 text-xs">配色主题</span>
                <div className="flex gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => updateSettings({ theme: t.id })}
                      className={cn(
                        'flex-1 h-12 rounded-lg border-2 text-xs font-bold transition-all',
                        settings.theme === t.id ? 'border-emerald-500 scale-105' : 'border-white/10 opacity-70',
                      )}
                      style={{ backgroundColor: t.bg, color: t.fg }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <SettingSwitch
                label="水平镜像（分光镜提词器）"
                icon={<FlipHorizontal2 className="w-4 h-4" />}
                checked={settings.mirrorH}
                onChange={(v) => updateSettings({ mirrorH: v })}
              />
              <SettingSwitch
                label="垂直镜像"
                icon={<FlipVertical2 className="w-4 h-4" />}
                checked={settings.mirrorV}
                onChange={(v) => updateSettings({ mirrorV: v })}
              />
              <SettingSwitch
                label="焦点参考线"
                checked={settings.focusLine}
                onChange={(v) => updateSettings({ focusLine: v })}
              />
              <SettingSwitch
                label="提示音（更新/结束/倒计时）"
                checked={settings.sound}
                onChange={(v) => updateSettings({ sound: v })}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-white/50 text-xs">{label}</span>
        <span className="text-white/70 text-xs font-mono">
          {value}
          {unit ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function SettingSwitch({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-white/60 text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
