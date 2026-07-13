/** 文稿绑定的共享房间信息（编辑端持有） */
export interface RoomBinding {
  roomId: string;
  /** 编辑密钥，仅创建房间的本机持有 */
  editKey: string;
  lastSyncedVersion: number;
  /** 上次成功同步时的内容指纹，用于判断是否有未同步修改 */
  lastSyncedHash: string;
  lastSyncedAt: number;
}

export interface Script {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  room?: RoomBinding;
}

export type ThemeId = 'dark-white' | 'dark-yellow' | 'light';

export interface Theme {
  id: ThemeId;
  label: string;
  bg: string;
  fg: string;
  dim: string;
}

export const THEMES: Theme[] = [
  { id: 'dark-white', label: '黑底白字', bg: '#000000', fg: '#ffffff', dim: 'rgba(255,255,255,0.28)' },
  { id: 'dark-yellow', label: '黑底黄字', bg: '#000000', fg: '#ffd400', dim: 'rgba(255,212,0,0.28)' },
  { id: 'light', label: '白底黑字', bg: '#ffffff', fg: '#111111', dim: 'rgba(0,0,0,0.25)' },
];

export interface PrompterSettings {
  /** 滚动速度（像素/秒） */
  speed: number;
  fontSize: number;
  /** 行距倍数 */
  lineHeight: number;
  /** 左右边距（百分比） */
  marginX: number;
  theme: ThemeId;
  mirrorH: boolean;
  mirrorV: boolean;
  /** 焦点参考线 + 上下遮罩 */
  focusLine: boolean;
  /** 播放前倒计时秒数 */
  countdown: number;
  /** 收到远端更新 / 播放结束时的提示音 */
  sound: boolean;
}

export const DEFAULT_SETTINGS: PrompterSettings = {
  speed: 60,
  fontSize: 44,
  lineHeight: 1.7,
  marginX: 8,
  theme: 'dark-white',
  mirrorH: false,
  mirrorV: false,
  focusLine: true,
  countdown: 3,
  sound: true,
};

/** 房间内容快照（服务端下发） */
export interface RoomSnapshot {
  id: string;
  title: string;
  content: string;
  version: number;
  updatedAt: number;
  viewers?: number;
}

/** 估算朗读时长（秒）：中文按 ~240 字/分钟，英文按 ~160 词/分钟 */
export function estimateDuration(content: string): number {
  const cjk = (content.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const words = (content.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, ' ').match(/[a-zA-Z0-9]+/g) || []).length;
  return Math.round((cjk / 240 + words / 160) * 60);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 字数统计（中文按字、英文按词） */
export function countWords(content: string): number {
  const cjk = (content.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const words = (content.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, ' ').match(/[a-zA-Z0-9]+/g) || []).length;
  return cjk + words;
}

/** 简易内容指纹，用于比较本地内容与已同步内容 */
export function contentHash(title: string, content: string): string {
  const str = `${title}\u0000${content}`;
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return `${str.length}-${(h >>> 0).toString(36)}`;
}
