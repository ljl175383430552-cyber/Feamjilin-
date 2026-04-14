import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Maximize, 
  Minimize, 
  Settings2, 
  Eye, 
  Palette, 
  Sun,
  Info,
  Target,
  Move,
  Maximize2,
  RotateCcw,
  Share
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/src/lib/utils';

type ScreenColor = 'green' | 'blue' | 'white' | 'red' | 'black';

const COLORS: Record<ScreenColor, string> = {
  green: '#00FF00',
  blue: '#0000FF',
  white: '#FFFFFF',
  red: '#FF0000',
  black: '#000000',
};

export default function App() {
  const [currentColor, setCurrentColor] = useState<ScreenColor>('green');
  const [isLocked, setIsLocked] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstruction, setShowIOSInstruction] = useState(false);
  const [showControls, setShowControls] = useState(false);

  // Sync theme-color meta tag with current background color
  useEffect(() => {
    const color = COLORS[currentColor];
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', color);
    }
    
    // Also update apple-mobile-web-app-status-bar-style dynamically if possible
    // (Note: This is less reliable than theme-color but worth a try)
    const appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleMeta) {
      // For white background, use default (black text), for others use black-translucent (white text)
      appleMeta.setAttribute('content', currentColor === 'white' ? 'default' : 'black-translucent');
    }
  }, [currentColor]);

  const [showSettingsButton, setShowSettingsButton] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [opacity, setOpacity] = useState(100);
  const [trackingPointsCount, setTrackingPointsCount] = useState<number>(0);
  const [markerScale, setMarkerScale] = useState(100);
  const [markers, setMarkers] = useState<{ id: number; x: number; y: number }[]>([]);
  const [unlockProgress, setUnlockProgress] = useState(0);
  const [isUnlocking, setIsUnlocking] = useState(false);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unlockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-hide settings button
  const resetSettingsButtonTimer = useCallback(() => {
    if (isLocked) return;
    setShowSettingsButton(true);
    if (buttonTimeoutRef.current) clearTimeout(buttonTimeoutRef.current);
    buttonTimeoutRef.current = setTimeout(() => {
      if (!showControls) {
        setShowSettingsButton(false);
      }
    }, 3000);
  }, [isLocked, showControls]);

  // Auto-hide controls card
  const resetControlsTimer = useCallback(() => {
    if (isLocked) return;
    setShowControls(true);
    setShowSettingsButton(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      // Also hide button after card hides
      if (buttonTimeoutRef.current) clearTimeout(buttonTimeoutRef.current);
      buttonTimeoutRef.current = setTimeout(() => {
        setShowSettingsButton(false);
      }, 1000);
    }, 2000);
  }, [isLocked]);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      resetSettingsButtonTimer();
    }
    lastTapRef.current = now;
  }, [resetSettingsButtonTimer]);

  useEffect(() => {
    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);
    
    // Detect Standalone (PWA)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isStandaloneMode);

    // Show settings button on initial load so user knows where it is
    resetSettingsButtonTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (buttonTimeoutRef.current) clearTimeout(buttonTimeoutRef.current);
    };
  }, []); // Only on mount

  // Fullscreen handling
  const requestFullscreen = (element: HTMLElement) => {
    const el = element as any;
    const docEl = document.documentElement as any;
    
    const request = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen ||
                    docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
    
    if (request) {
      request.call(el.requestFullscreen ? el : docEl);
      return true;
    }
    return false;
  };

  const toggleFullscreen = async () => {
    // Special handling for iOS Safari which doesn't support requestFullscreen on divs
    if (isIOS && !isStandalone) {
      setShowIOSInstruction(true);
      setShowControls(false);
      return;
    }

    const doc = document as any;
    const isFS = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
    
    if (!isFS) {
      try {
        if (containerRef.current) {
          const success = requestFullscreen(containerRef.current);
          if (success) {
            setIsFullscreen(true);
          } else {
            // Fallback for devices where API is missing but not detected as iOS
            setShowIOSInstruction(true);
            setShowControls(false);
          }
        }
      } catch (err) {
        console.error(`Error attempting to enable full-screen mode: ${err}`);
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleFirstInteraction = () => {
      const doc = document as any;
      const isFS = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
      if (!isFS && !isLocked && containerRef.current) {
        // Don't show instruction on first interaction to avoid annoying the user
        // Just try to go fullscreen if possible
        requestFullscreen(containerRef.current);
      }
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('pointerdown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [isLocked]);

  // Lock mechanism
  const handleLock = () => {
    setIsLocked(true);
    setShowControls(false);
  };

  const startUnlock = () => {
    if (!isLocked) return;
    setIsUnlocking(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 1; 
      setUnlockProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsLocked(false);
        setShowControls(true);
        setUnlockProgress(0);
        setIsUnlocking(false);
      }
    }, 50);
    unlockTimerRef.current = interval;
  };

  const cancelUnlock = () => {
    if (unlockTimerRef.current) {
      clearInterval(unlockTimerRef.current);
      setUnlockProgress(0);
      setIsUnlocking(false);
    }
  };

  const handleReset = () => {
    setBrightness(100);
    setOpacity(100);
    setTrackingPointsCount(0);
    setMarkerScale(100);
    setCurrentColor('green');
  };

  // Initialize markers based on count
  useEffect(() => {
    const newMarkers = [];
    if (trackingPointsCount === 1) {
      newMarkers.push({ id: 0, x: 50, y: 50 });
    } else if (trackingPointsCount === 3) {
      newMarkers.push(
        { id: 0, x: 50, y: 35 }, 
        { id: 1, x: 30, y: 65 }, 
        { id: 2, x: 70, y: 65 }
      );
    } else if (trackingPointsCount === 5) {
      newMarkers.push(
        { id: 0, x: 25, y: 25 }, { id: 1, x: 75, y: 25 },
        { id: 2, x: 50, y: 50 },
        { id: 3, x: 25, y: 75 }, { id: 4, x: 75, y: 75 }
      );
    } else if (trackingPointsCount === 9) {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          newMarkers.push({ id: i * 3 + j, x: (j + 1) * 25, y: (i + 1) * 25 });
        }
      }
    }
    setMarkers(newMarkers);
  }, [trackingPointsCount]);

  const updateMarkerPos = (id: number, x: number, y: number) => {
    setMarkers(prev => prev.map(m => m.id === id ? { ...m, x, y } : m));
  };

  const renderTrackingPoints = () => {
    if (trackingPointsCount === 0) return null;

    return markers.map((marker) => (
      <motion.div
        key={marker.id}
        drag={!isLocked}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={containerRef}
        whileTap={{ scale: 1.1 }}
        onPointerDown={(e) => {
          e.stopPropagation();
          setShowControls(false);
        }}
        onDragStart={() => setShowControls(false)}
        onDrag={(_, info) => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = ((info.point.x - rect.left) / rect.width) * 100;
            const y = ((info.point.y - rect.top) / rect.height) * 100;
            updateMarkerPos(marker.id, x, y);
          }
        }}
        className={cn(
          "absolute -translate-x-1/2 -translate-y-1/2 z-20 touch-none",
          !isLocked ? "cursor-move" : "pointer-events-none"
        )}
        style={{ 
          top: `${marker.y}%`, 
          left: `${marker.x}%`,
        }}
        animate={{ 
          width: (markerScale / 100) * 64,
          height: (markerScale / 100) * 64
        }}
      >
        {/* Professional Checkerboard Tracking Marker */}
        <div className="relative w-full h-full rounded-full overflow-hidden border border-black/30 shadow-xl ring-1 ring-black/10">
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            <div className="bg-black" />
            <div className="bg-white" />
            <div className="bg-white" />
            <div className="bg-black" />
          </div>
          {/* Center precision dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-gray-500/50" />
          </div>
        </div>
      </motion.div>
    ));
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 overflow-hidden bg-black select-none"
      onPointerDown={handleDoubleTap}
    >
      {/* Main Color Screen */}
      <motion.div 
        className="fixed inset-0 z-0"
        initial={false}
        animate={{ 
          backgroundColor: COLORS[currentColor] || COLORS.green,
          opacity: (Number(opacity) || 0) / 100 
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />

      {/* Brightness Overlay - Moved to z-5 to be behind markers and controls */}
      <div 
        className="fixed inset-0 z-5 pointer-events-none bg-black"
        style={{ opacity: Math.max(0, Math.min(1, 1 - (Number(brightness) || 0) / 100)) }}
      />

      {/* Tracking Points - z-20 */}
      {renderTrackingPoints()}

      {/* Lock Overlay - z-50 */}
      <AnimatePresence>
        {isLocked && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-transparent"
            onMouseDown={startUnlock}
            onMouseUp={cancelUnlock}
            onMouseLeave={cancelUnlock}
            onTouchStart={startUnlock}
            onTouchEnd={cancelUnlock}
          >
            {isUnlocking && unlockProgress >= 100 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 p-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20"
              >
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="30"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="4"
                    />
                    <motion.circle
                      cx="32"
                      cy="32"
                      r="30"
                      fill="none"
                      stroke="white"
                      strokeWidth="4"
                      strokeDasharray="188.4"
                      animate={{ strokeDashoffset: 188.4 - (188.4 * unlockProgress) / 100 }}
                    />
                  </svg>
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <p className="text-white text-xs font-medium tracking-widest uppercase">
                  Unlocking...
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatePresence>
        {showControls && !isLocked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-md max-h-[80vh] flex flex-col"
          >
            <Card 
              className="flex-1 bg-black/60 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-mono text-white/60 uppercase tracking-widest">
                      System Active
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white/60 hover:text-white hover:bg-white/10"
                      onClick={toggleFullscreen}
                    >
                      {isIOS && !isStandalone ? (
                        <Info className="w-4 h-4" />
                      ) : isFullscreen ? (
                        <Minimize className="w-4 h-4" />
                      ) : (
                        <Maximize className="w-4 h-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white/60 hover:text-white hover:bg-white/10"
                      onClick={handleReset}
                      title="Reset Settings"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white/60 hover:text-white hover:bg-white/10"
                      onClick={handleLock}
                    >
                      <Lock className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Color Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-white/40">
                    <Palette className="w-3 h-3" />
                    <span className="text-[10px] uppercase font-bold tracking-tighter">Color Matrix</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    {(Object.keys(COLORS) as ScreenColor[]).map((color) => (
                      <button
                        key={color}
                        onClick={() => setCurrentColor(color)}
                        className={cn(
                          "flex-1 h-12 rounded-lg border-2 transition-all duration-200",
                          currentColor === color 
                            ? "border-white scale-105 shadow-lg" 
                            : "border-transparent opacity-60 hover:opacity-100"
                        )}
                        style={{ backgroundColor: COLORS[color] }}
                      />
                    ))}
                  </div>
                </div>

                {/* Brightness */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/40">
                      <Sun className="w-3 h-3" />
                      <span className="text-[10px] uppercase font-bold tracking-tighter">Luminance</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/60">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    value={brightness}
                    onChange={(e) => {
                      setBrightness(parseInt(e.target.value));
                      resetControlsTimer();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    max={100}
                    step={1}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white outline-none"
                  />
                </div>

                {/* Opacity */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/40">
                      <Eye className="w-3 h-3" />
                      <span className="text-[10px] uppercase font-bold tracking-tighter">Opacity</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/60">{opacity}%</span>
                  </div>
                  <input
                    type="range"
                    value={opacity}
                    onChange={(e) => {
                      setOpacity(parseInt(e.target.value));
                      resetControlsTimer();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    max={100}
                    step={1}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white outline-none"
                  />
                </div>

                {/* Tracking Points */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-white/40">
                    <Target className="w-3 h-3" />
                    <span className="text-[10px] uppercase font-bold tracking-tighter">Tracking Markers</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    {[0, 1, 3, 5, 9].map((num) => (
                      <Button
                        key={num}
                        variant={trackingPointsCount === num ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "flex-1 h-8 text-[10px] font-mono",
                          trackingPointsCount === num 
                            ? "bg-white text-black hover:bg-white/90" 
                            : "bg-transparent text-white/60 border-white/10 hover:bg-white/5"
                        )}
                        onClick={() => setTrackingPointsCount(num)}
                      >
                        {num === 0 ? 'OFF' : `${num}P`}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Marker Scale */}
                {trackingPointsCount > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/40">
                        <Maximize2 className="w-3 h-3" />
                        <span className="text-[10px] uppercase font-bold tracking-tighter">Marker Size</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/60">{markerScale}%</span>
                    </div>
                    <input
                      type="range"
                      value={markerScale}
                      onChange={(e) => {
                        const newScale = parseInt(e.target.value);
                        setMarkerScale(newScale);
                        resetControlsTimer();
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      min={10}
                      max={300}
                      step={1}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white outline-none"
                    />
                  </div>
                )}

                {/* Footer Info */}
                <div className="flex flex-col items-center justify-center gap-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1">
                    <Info className="w-3 h-3 text-white/20" />
                    <span className="text-[9px] text-white/20 uppercase tracking-[0.2em]">
                      ChromaScreen v1.0.0
                    </span>
                  </div>
                  <p className="text-[8px] text-white/30 text-center leading-tight">
                    Tip: On iPhone, use "Add to Home Screen" for true full-screen experience.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Settings Toggle (when controls are hidden) */}
      <AnimatePresence>
        {showSettingsButton && !showControls && !isLocked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-[33%] left-1/2 -translate-x-1/2 z-40"
          >
            <Button
              size="icon"
              className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-black/60"
              onClick={(e) => {
                e.stopPropagation();
                resetControlsTimer();
              }}
            >
              <Settings2 className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Fullscreen Instruction Overlay */}
      <AnimatePresence>
        {showIOSInstruction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setShowIOSInstruction(false)}
          >
            <div className="max-w-xs w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center gap-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                <Share className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-3">
                <h3 className="text-white font-bold text-xl tracking-tight">iOS 全屏指南</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  由于 iOS Safari 系统的限制，普通网页无法直接进入全屏模式。
                </p>
                <div className="bg-white/5 rounded-2xl p-4 text-left space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">1</div>
                    <p className="text-white/80 text-xs">点击浏览器底部的 <span className="text-white font-bold">“分享”</span> 按钮</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">2</div>
                    <p className="text-white/80 text-xs">选择 <span className="text-white font-bold">“添加到主屏幕”</span></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">3</div>
                    <p className="text-white/80 text-xs">打开桌面图标，<span className="text-white font-bold">横屏使用</span> 效果最佳</p>
                  </div>
                </div>
              </div>
              <div className="w-full h-px bg-white/10" />
              <p className="text-white/40 text-[10px] italic">
                如果仍有白边，请尝试重新“添加到主屏幕”。
              </p>
              <Button 
                className="w-full h-12 rounded-xl bg-white text-black hover:bg-white/90 font-bold text-sm"
                onClick={() => setShowIOSInstruction(false)}
              >
                我知道了
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Unlock Tip (only visible briefly when tapping while locked) */}
      {isLocked && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none opacity-20">
          <span className="text-[10px] text-white font-mono uppercase tracking-[0.5em]">
            System Locked
          </span>
        </div>
      )}
    </div>
  );
}
