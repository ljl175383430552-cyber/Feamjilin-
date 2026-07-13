import type { RoomSnapshot } from '@/src/types';

/** 同源部署，直接走相对路径；开发环境由 Vite 代理到后端 */
const API_BASE = '';

export interface CreateRoomResult extends RoomSnapshot {
  editKey: string;
}

export interface PushResult extends RoomSnapshot {
  conflict?: boolean;
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = '';
    try {
      detail = ((await res.json()) as { error?: string }).error ?? '';
    } catch {
      // 忽略响应体解析失败
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function createRoom(title: string, content: string): Promise<CreateRoomResult> {
  const res = await fetch(`${API_BASE}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  return jsonOrThrow<CreateRoomResult>(res);
}

export async function fetchRoom(roomId: string): Promise<RoomSnapshot> {
  const res = await fetch(`${API_BASE}/api/rooms/${encodeURIComponent(roomId)}`);
  return jsonOrThrow<RoomSnapshot>(res);
}

export async function pushRoom(
  roomId: string,
  editKey: string,
  data: { title: string; content: string; baseVersion: number },
): Promise<PushResult> {
  const res = await fetch(`${API_BASE}/api/rooms/${encodeURIComponent(roomId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-edit-key': editKey },
    body: JSON.stringify(data),
  });
  return jsonOrThrow<PushResult>(res);
}

export interface RoomSubscription {
  close: () => void;
}

/** 观看端订阅房间更新（SSE，自带断线重连） */
export function subscribeRoom(
  roomId: string,
  handlers: {
    onUpdate: (snapshot: RoomSnapshot) => void;
    onPresence?: (viewers: number) => void;
    onConnectionChange?: (connected: boolean) => void;
  },
): RoomSubscription {
  const es = new EventSource(`${API_BASE}/api/rooms/${encodeURIComponent(roomId)}/events`);

  es.addEventListener('update', (e) => {
    try {
      handlers.onUpdate(JSON.parse((e as MessageEvent).data) as RoomSnapshot);
    } catch {
      // 忽略坏数据帧
    }
  });

  es.addEventListener('presence', (e) => {
    try {
      const { viewers } = JSON.parse((e as MessageEvent).data) as { viewers: number };
      handlers.onPresence?.(viewers);
    } catch {
      // 忽略坏数据帧
    }
  });

  es.onopen = () => handlers.onConnectionChange?.(true);
  es.onerror = () => handlers.onConnectionChange?.(false);

  return { close: () => es.close() };
}

/** 生成观看端分享链接（哈希路由，任何静态托管都可用） */
export function roomShareUrl(roomId: string): string {
  return `${location.origin}${location.pathname}#/room/${roomId}`;
}
