import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.SYNC_PORT || process.env.PORT || 8787);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'rooms.json');

interface Room {
  id: string;
  editKey: string;
  title: string;
  content: string;
  version: number;
  createdAt: number;
  updatedAt: number;
}

// ---------- 房间存储：内存 Map + 防抖落盘 JSON ----------

const rooms = new Map<string, Room>();

function loadRooms() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as Room[];
      for (const room of raw) rooms.set(room.id, room);
      console.log(`[sync] 已从磁盘恢复 ${rooms.size} 个房间`);
    }
  } catch (err) {
    console.error('[sync] 房间数据读取失败：', err);
  }
}

let saveTimer: NodeJS.Timeout | null = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify([...rooms.values()]));
    } catch (err) {
      console.error('[sync] 房间数据写入失败：', err);
    }
  }, 2000);
}

// ---------- SSE 广播 ----------

/** roomId -> 该房间所有观看端的响应流 */
const sseClients = new Map<string, Set<Response>>();

function viewerCount(roomId: string): number {
  return sseClients.get(roomId)?.size ?? 0;
}

function broadcast(roomId: string, event: string, data: unknown) {
  const clients = sseClients.get(roomId);
  if (!clients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
}

function roomSnapshot(room: Room) {
  return {
    id: room.id,
    title: room.title,
    content: room.content,
    version: room.version,
    updatedAt: room.updatedAt,
  };
}

// ---------- API ----------

const app = express();
app.use(express.json({ limit: '2mb' }));

/** 创建房间，返回房间号 + 编辑密钥（编辑密钥只在此时下发一次） */
app.post('/api/rooms', (req: Request, res: Response) => {
  const id = crypto.randomBytes(4).toString('hex');
  const editKey = crypto.randomBytes(16).toString('hex');
  const now = Date.now();
  const { title = '', content = '' } = (req.body ?? {}) as Partial<Room>;
  const room: Room = {
    id,
    editKey,
    title: String(title),
    content: String(content),
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  rooms.set(id, room);
  scheduleSave();
  res.json({ ...roomSnapshot(room), editKey });
});

/** 拉取房间当前内容快照（观看端进入/重连时调用） */
app.get('/api/rooms/:id', (req: Request, res: Response) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'room_not_found' });
  res.json({ ...roomSnapshot(room), viewers: viewerCount(room.id) });
});

/** 编辑端推送新内容，需携带编辑密钥；成功后广播给所有观看端 */
app.put('/api/rooms/:id', (req: Request, res: Response) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'room_not_found' });

  const editKey = req.header('x-edit-key');
  if (!editKey || editKey !== room.editKey) {
    return res.status(403).json({ error: 'invalid_edit_key' });
  }

  const { title, content, baseVersion } = (req.body ?? {}) as {
    title?: string;
    content?: string;
    baseVersion?: number;
  };
  // 版本冲突提示：多个编辑端同时改稿时，后推送方会被告知已有更新版本
  const conflict = typeof baseVersion === 'number' && baseVersion !== room.version;

  if (typeof title === 'string') room.title = title;
  if (typeof content === 'string') room.content = content;
  room.version += 1;
  room.updatedAt = Date.now();
  rooms.set(room.id, room);
  scheduleSave();

  broadcast(room.id, 'update', roomSnapshot(room));
  res.json({ ...roomSnapshot(room), viewers: viewerCount(room.id), conflict });
});

/** SSE 长连接：观看端订阅内容更新与在线人数 */
app.get('/api/rooms/:id/events', (req: Request, res: Response) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'room_not_found' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`retry: 3000\n\n`);

  let clients = sseClients.get(room.id);
  if (!clients) {
    clients = new Set();
    sseClients.set(room.id, clients);
  }
  clients.add(res);

  // 新连接先收到当前快照，保证中途加入的设备不落后
  res.write(`event: update\ndata: ${JSON.stringify(roomSnapshot(room))}\n\n`);
  broadcast(room.id, 'presence', { viewers: viewerCount(room.id) });

  const heartbeat = setInterval(() => res.write(`:ping\n\n`), 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients!.delete(res);
    broadcast(room.id, 'presence', { viewers: viewerCount(room.id) });
  });
});

// ---------- 生产环境：托管前端构建产物 ----------

const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

loadRooms();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[sync] 提词器同步服务已启动: http://0.0.0.0:${PORT}`);
});
