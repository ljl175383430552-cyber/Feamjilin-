import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  COLOR_ORDER,
  MARKER_COUNTS,
  MARKER_STYLES,
  MAX_MARKER_PX,
  MIN_MARKER_PX,
  SCREEN_COLORS,
  UNLOCK_HOLD_MS,
  markerLayout,
  nextColor,
  type MarkerStyle,
  type ScreenColor,
} from './chromaShared';

const STORAGE_KEY = 'chromawatch_web_settings_v1';

type Settings = {
  color: ScreenColor;
  count: number;
  style: MarkerStyle;
  sizePx: number;
  offsetX: number;
  offsetY: number;
};

const DEFAULTS: Settings = {
  color: 'green',
  count: 1,
  style: 'checker',
  sizePx: 36,
  offsetX: 0,
  offsetY: 0,
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function MarkerGlyph({ style, size }: { style: MarkerStyle; size: number }) {
  const half = size / 2;
  if (style === 'checker') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={half} cy={half} r={half} fill="#fff" />
        <path d={`M ${half} ${half} L ${half} 0 A ${half} ${half} 0 0 0 0 ${half} Z`} fill="#111" />
        <path
          d={`M ${half} ${half} L ${half} ${size} A ${half} ${half} 0 0 0 ${size} ${half} Z`}
          fill="#111"
        />
        <circle cx={half} cy={half} r={Math.max(1, size * 0.045)} fill="#9e9e9e" />
      </svg>
    );
  }
  if (style === 'bullseye') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={half} cy={half} r={half} fill="#111" />
        <circle cx={half} cy={half} r={half * 0.72} fill="#fff" />
        <circle cx={half} cy={half} r={half * 0.44} fill="#111" />
        <circle cx={half} cy={half} r={half * 0.16} fill="#fff" />
      </svg>
    );
  }
  if (style === 'cross') {
    const t = Math.max(2, size * 0.11);
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={half} cy={half} r={half} fill="#fff" />
        <rect x={half - t / 2} y={size * 0.08} width={t} height={size * 0.84} fill="#111" />
        <rect x={size * 0.08} y={half - t / 2} width={size * 0.84} height={t} fill="#111" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={half} cy={half} r={half} fill="#fff" />
      <circle cx={half} cy={half} r={half * 0.62} fill="#111" />
    </svg>
  );
}

/**
 * 手表浏览器即用的绿幕页。不依赖安装 APK：
 * 临时换表 / 新品牌只要能开网页（或手机浏览器开全屏戴在腕上）就能拍。
 */
export default function WatchApp() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [panel, setPanel] = useState(true);
  const [locked, setLocked] = useState(false);
  const [unlockProgress, setUnlockProgress] = useState(0);
  const [hint, setHint] = useState('轻点唤出菜单 · 锁定后长按 3 秒解锁');
  const pressRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    document.title = '腕上绿幕';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', SCREEN_COLORS[settings.color].hex);
  }, [settings.color]);

  useEffect(() => {
    if (!panel || locked) return;
    const t = window.setTimeout(() => setPanel(false), 8000);
    return () => clearTimeout(t);
  }, [panel, locked, settings]);

  const bump = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    setPanel(true);
  }, []);

  const cancelUnlock = useCallback(() => {
    if (pressRef.current != null) {
      clearInterval(pressRef.current);
      pressRef.current = null;
    }
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setUnlockProgress(0);
  }, []);

  const startUnlock = useCallback(() => {
    if (!locked) return;
    cancelUnlock();
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / UNLOCK_HOLD_MS);
      setUnlockProgress(p);
      if (p >= 1) {
        setLocked(false);
        setPanel(true);
        setUnlockProgress(0);
        setHint('已解锁');
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [locked, cancelUnlock]);

  const requestFs = async () => {
    const el = rootRef.current as any;
    try {
      if (el?.requestFullscreen) await el.requestFullscreen();
      else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch {
      /* 手表浏览器常不支持，忽略 */
    }
  };

  const positions = markerLayout(settings.count, settings.offsetX, settings.offsetY);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 select-none overflow-hidden"
      style={{ backgroundColor: SCREEN_COLORS[settings.color].hex, touchAction: 'none' }}
      onPointerDown={(e) => {
        if (locked) {
          startUnlock();
          return;
        }
        if (panel) return;
        // 空白处轻点唤菜单；点在中心跟踪点上则准备拖动
        const target = e.target as HTMLElement;
        if (target.dataset.marker === '1') {
          dragRef.current = { x: e.clientX, y: e.clientY };
          return;
        }
        setPanel(true);
      }}
      onPointerMove={(e) => {
        if (!dragRef.current || locked || panel) return;
        const dx = (e.clientX - dragRef.current.x) / window.innerWidth;
        const dy = (e.clientY - dragRef.current.y) / window.innerHeight;
        dragRef.current = { x: e.clientX, y: e.clientY };
        setSettings((s) => ({
          ...s,
          offsetX: Math.max(-0.45, Math.min(0.45, s.offsetX + dx)),
          offsetY: Math.max(-0.45, Math.min(0.45, s.offsetY + dy)),
        }));
      }}
      onPointerUp={() => {
        dragRef.current = null;
        if (locked) cancelUnlock();
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        if (locked) cancelUnlock();
      }}
      onPointerLeave={() => {
        if (locked) cancelUnlock();
      }}
    >
      {positions.map((p, i) => (
        <div
          key={i}
          data-marker={i === 0 ? '1' : undefined}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${p.x * 100}%`,
            top: `${p.y * 100}%`,
            width: settings.sizePx,
            height: settings.sizePx,
            pointerEvents: locked || panel ? 'none' : i === 0 ? 'auto' : 'none',
          }}
        >
          <MarkerGlyph style={settings.style} size={settings.sizePx} />
        </div>
      ))}

      {locked && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
          {unlockProgress > 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-full bg-black/45 px-5 py-4">
              <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - unlockProgress)}`}
                />
              </svg>
              <span className="text-[10px] tracking-widest text-white/80">解锁中</span>
            </div>
          ) : (
            <span className="text-[10px] tracking-[0.25em] text-white/35">已锁定 · 长按 3 秒</span>
          )}
        </div>
      )}

      {panel && !locked && (
        <div
          className="absolute inset-0 z-40 overflow-y-auto bg-black/70 px-[12%] py-[14%] text-white"
          onPointerDown={(e) => e.stopPropagation()}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] tracking-widest text-white/50">腕上绿幕 · 网页版</span>
            <button
              type="button"
              className="rounded-full bg-white/10 px-3 py-1 text-[10px]"
              onClick={() => setPanel(false)}
            >
              收起
            </button>
          </div>

          <p className="mb-2 text-[10px] text-white/40">色幕</p>
          <div className="mb-3 grid grid-cols-4 gap-1.5">
            {COLOR_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                title={SCREEN_COLORS[id].label}
                className={`h-8 rounded-md border-2 ${
                  settings.color === id ? 'border-white' : 'border-transparent opacity-70'
                }`}
                style={{ backgroundColor: SCREEN_COLORS[id].hex }}
                onClick={() => bump({ color: id })}
              />
            ))}
          </div>

          <p className="mb-2 text-[10px] text-white/40">跟踪点数量</p>
          <div className="mb-3 flex gap-1">
            {MARKER_COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                className={`flex-1 rounded-full py-1.5 text-[11px] ${
                  settings.count === n ? 'bg-white text-black' : 'bg-white/10 text-white/70'
                }`}
                onClick={() => bump({ count: n })}
              >
                {n === 0 ? '关' : n}
              </button>
            ))}
          </div>

          {settings.count > 0 && (
            <>
              <p className="mb-2 text-[10px] text-white/40">样式</p>
              <div className="mb-3 grid grid-cols-2 gap-1">
                {MARKER_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`rounded-full py-1.5 text-[11px] ${
                      settings.style === s.id ? 'bg-white text-black' : 'bg-white/10 text-white/70'
                    }`}
                    onClick={() => bump({ style: s.id })}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <p className="mb-2 text-[10px] text-white/40">大小 {settings.sizePx}px</p>
              <div className="mb-3 flex items-center gap-2">
                <button
                  type="button"
                  className="h-8 w-8 rounded-full bg-white/10 text-lg"
                  onClick={() => bump({ sizePx: Math.max(MIN_MARKER_PX, settings.sizePx - 4) })}
                >
                  −
                </button>
                <input
                  type="range"
                  min={MIN_MARKER_PX}
                  max={MAX_MARKER_PX}
                  value={settings.sizePx}
                  className="flex-1 accent-white"
                  onChange={(e) => bump({ sizePx: Number(e.target.value) })}
                />
                <button
                  type="button"
                  className="h-8 w-8 rounded-full bg-white/10 text-lg"
                  onClick={() => bump({ sizePx: Math.min(MAX_MARKER_PX, settings.sizePx + 4) })}
                >
                  +
                </button>
              </div>
            </>
          )}

          <div className="mt-2 flex flex-col gap-2">
            <button
              type="button"
              className="rounded-full bg-[#00E39A] py-2.5 text-[13px] font-bold text-black"
              onClick={() => {
                setLocked(true);
                setPanel(false);
                setHint('已锁定');
                void requestFs();
              }}
            >
              锁定屏幕
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-full bg-white/10 py-2 text-[11px]"
                onClick={() => bump({ color: nextColor(settings.color) })}
              >
                下一色
              </button>
              <button
                type="button"
                className="flex-1 rounded-full bg-white/10 py-2 text-[11px]"
                onClick={() => bump({ offsetX: 0, offsetY: 0 })}
              >
                点位居中
              </button>
              <button
                type="button"
                className="flex-1 rounded-full bg-white/10 py-2 text-[11px]"
                onClick={() => void requestFs()}
              >
                全屏
              </button>
            </div>
            <a
              href="/join"
              className="text-center text-[10px] text-white/35 underline-offset-2"
            >
              换表？打开接入页
            </a>
          </div>
          <p className="mt-3 text-center text-[9px] text-white/25">{hint}</p>
        </div>
      )}
    </div>
  );
}
