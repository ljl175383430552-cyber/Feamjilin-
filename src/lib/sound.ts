let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, startAt: number, duration: number, volume = 0.18) {
  const ac = audioCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const t0 = ac.currentTime + startAt;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** 收到远端内容更新的提示音（双音上行） */
export function playUpdateChime() {
  tone(660, 0, 0.16);
  tone(990, 0.14, 0.22);
}

/** 倒计时滴答 */
export function playTick() {
  tone(880, 0, 0.08, 0.12);
}

/** 播放到达结尾 / 任务完成的提示音（三音上行） */
export function playFinish() {
  tone(523.25, 0, 0.15);
  tone(659.25, 0.16, 0.15);
  tone(783.99, 0.32, 0.3);
}

/** 同步成功提示音 */
export function playSyncOk() {
  tone(783.99, 0, 0.12);
  tone(1046.5, 0.1, 0.18);
}
