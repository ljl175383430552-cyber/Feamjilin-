#!/usr/bin/env node
/**
 * 剧组现场「局域网接入枢纽」
 *
 * 电脑连上手机热点 / 路由器后执行：
 *   npm run field
 *
 * 会：
 *  1. 构建（或复用）Web 产物
 *  2. 若存在手表 APK，挂到 /apk/chromawatch.apk
 *  3. 在 0.0.0.0 起服务，终端打印局域网二维码
 *
 * 手机扫码 → 接入页；再把 /w 发到手表浏览器 → 零安装开拍。
 */
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, createReadStream, statSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.FIELD_PORT || 8787);
const APK_CANDIDATES = [
  join(ROOT, 'wear/app/build/outputs/apk/universal/release/app-universal-release.apk'),
  join(ROOT, 'wear/app/build/outputs/apk/universal/debug/app-universal-debug.apk'),
  join(ROOT, 'public/apk/chromawatch.apk'),
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.apk': 'application/vnd.android.package-archive',
  '.woff2': 'font/woff2',
};

function ensureBuild() {
  if (existsSync(join(DIST, 'index.html')) && process.env.FIELD_SKIP_BUILD === '1') return;
  console.log('→ 构建 Web 产物…');
  const r = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status || 1);
}

function stageApk() {
  const destDir = join(DIST, 'apk');
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, 'chromawatch.apk');
  const src = APK_CANDIDATES.find((p) => existsSync(p));
  if (!src) {
    console.log('⚠ 未找到手表 APK（可先 cd wear && ./gradlew assembleUniversalRelease）');
    console.log('  网页版仍可用；原生包装载页会提示不可用。');
    return null;
  }
  copyFileSync(src, dest);
  const mb = (statSync(dest).size / 1024 / 1024).toFixed(2);
  console.log(`→ 已挂载 APK: ${src} (${mb} MB) → /apk/chromawatch.apk`);
  return dest;
}

function lanAddresses() {
  const nets = networkInterfaces();
  const out = [];
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

function sendFile(res, filePath) {
  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
  });
  createReadStream(filePath).pipe(res);
}

function spaFallback(urlPath) {
  // 手表 / 接入页用前端路由，统一回 index.html
  if (urlPath === '/w' || urlPath.startsWith('/w/') || urlPath === '/watch') return true;
  if (urlPath === '/join' || urlPath === '/pair' || urlPath === '/wear') return true;
  return false;
}

ensureBuild();
stageApk();

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  if (spaFallback(pathname)) {
    sendFile(res, join(DIST, 'index.html'));
    return;
  }

  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(DIST, safe);
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    sendFile(res, filePath);
    return;
  }
  // Vite 资源 404 时回 SPA，避免手表深链挂掉
  if (!pathname.includes('.')) {
    sendFile(res, join(DIST, 'index.html'));
    return;
  }
  res.writeHead(404).end('Not found');
});

server.listen(PORT, '0.0.0.0', async () => {
  const addrs = lanAddresses();
  const primary = addrs[0] || '127.0.0.1';
  const join = `http://${primary}:${PORT}/join`;
  const watch = `http://${primary}:${PORT}/w`;
  console.log('\n════════════════════════════════════════');
  console.log('  腕上绿幕 · 现场接入枢纽已启动');
  console.log('════════════════════════════════════════');
  console.log(`  本机:   http://127.0.0.1:${PORT}/join`);
  for (const ip of addrs) {
    console.log(`  局域网: http://${ip}:${PORT}/join`);
  }
  console.log(`  手表页: ${watch}`);
  console.log('────────────────────────────────────────');
  console.log('  手机扫这个二维码打开接入页：\n');
  try {
    console.log(await QRCode.toString(join, { type: 'terminal', small: true }));
  } catch {
    console.log(`  (二维码生成失败，请手动打开 ${join})`);
  }
  console.log('  流程：手机扫码 → 把「网页即用」链到手表浏览器 → 锁定开拍');
  console.log('  按 Ctrl+C 结束\n');
});
