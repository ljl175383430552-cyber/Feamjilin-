import { DEFAULT_SETTINGS, type PrompterSettings, type RoomSnapshot, type Script } from '@/src/types';

const SCRIPTS_KEY = 'prompter.scripts.v1';
const SETTINGS_KEY = 'prompter.settings.v1';
const ROOM_CACHE_PREFIX = 'prompter.roomcache.v1.';

export function loadScripts(): Script[] {
  try {
    const raw = localStorage.getItem(SCRIPTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Script[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveScripts(scripts: Script[]) {
  localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts));
}

export function getScript(id: string): Script | undefined {
  return loadScripts().find((s) => s.id === id);
}

export function upsertScript(script: Script) {
  const scripts = loadScripts();
  const idx = scripts.findIndex((s) => s.id === script.id);
  if (idx >= 0) scripts[idx] = script;
  else scripts.unshift(script);
  saveScripts(scripts);
}

export function deleteScript(id: string) {
  saveScripts(loadScripts().filter((s) => s.id !== id));
}

export function newScriptId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadSettings(): PrompterSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<PrompterSettings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: PrompterSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** 观看端缓存最近一次收到的房间内容，断网后仍可播放 */
export function cacheRoomSnapshot(snapshot: RoomSnapshot) {
  try {
    localStorage.setItem(ROOM_CACHE_PREFIX + snapshot.id, JSON.stringify(snapshot));
  } catch {
    // 存储满时忽略，不影响主流程
  }
}

export function loadCachedRoom(roomId: string): RoomSnapshot | null {
  try {
    const raw = localStorage.getItem(ROOM_CACHE_PREFIX + roomId);
    return raw ? (JSON.parse(raw) as RoomSnapshot) : null;
  } catch {
    return null;
  }
}
