import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Watch, Smartphone, Download, Wifi, Link2, CheckCircle2, ArrowRight } from 'lucide-react';

type Tab = 'web' | 'apk' | 'tips';

function useAbsoluteUrl(path: string) {
  return useMemo(() => {
    if (typeof window === 'undefined') return path;
    return new URL(path, window.location.origin).toString();
  }, [path]);
}

function QrBlock({ value, label }: { value: string; label: string }) {
  const [dataUrl, setDataUrl] = useState<string>('');
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: 280,
      margin: 1,
      color: { dark: '#0B0F0C', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl bg-white p-3 shadow-xl">
        {dataUrl ? (
          <img src={dataUrl} alt={label} width={240} height={240} className="h-60 w-60" />
        ) : (
          <div className="flex h-60 w-60 items-center justify-center text-sm text-zinc-400">生成中…</div>
        )}
      </div>
      <p className="max-w-xs break-all text-center font-mono text-[11px] text-emerald-200/80">{value}</p>
    </div>
  );
}

/**
 * 手机端「手表接入」枢纽页。
 *
 * 现场核心痛点：新表 / 临时换品牌来不及装原生 App。
 * 最快路径不是手表自己扫码（多数手表没摄像头），而是：
 *  1) 手机打开本页 → 把二维码 / 短链亮给手表浏览器打开（零安装网页版）
 *  2) 或手机扫/下载 APK 再推到手表
 *  3) 剧组局域网离线时用 `npm run field` 本机出码
 */
export default function JoinHub() {
  const [tab, setTab] = useState<Tab>('web');
  const [apkOk, setApkOk] = useState<boolean | null>(null);
  const watchUrl = useAbsoluteUrl('/w');
  const joinUrl = useAbsoluteUrl('/join');
  const apkUrl = useAbsoluteUrl('/apk/chromawatch.apk');

  useEffect(() => {
    document.title = '手表接入 · 腕上绿幕';
    fetch(apkUrl, { method: 'HEAD' })
      .then((r) => setApkOk(r.ok))
      .catch(() => setApkOk(false));
  }, [apkUrl]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-[#07110C] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,227,154,0.22), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(0,100,70,0.25), transparent)',
        }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 pb-10 pt-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 ring-1 ring-emerald-300/30">
            <Watch className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">手表接入</h1>
            <p className="mt-1 text-sm text-white/55">
              新表、临时换品牌、现场来不及装 App —— 先扫这个，网页版立刻能拍。
            </p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-1 rounded-2xl bg-white/5 p-1">
          {(
            [
              ['web', '网页即用'],
              ['apk', '装原生包'],
              ['tips', '现场窍门'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-xl py-2.5 text-xs font-medium transition ${
                tab === id ? 'bg-emerald-400 text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'web' && (
          <section className="flex flex-col items-center gap-5 rounded-3xl border border-white/10 bg-black/35 p-5 backdrop-blur">
            <div className="w-full space-y-2 text-sm text-white/70">
              <p className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-[11px] text-emerald-300">
                  1
                </span>
                用<strong className="mx-1 text-white">另一台手机</strong>扫下面二维码，或把链接发到手表浏览器。
              </p>
              <p className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-[11px] text-emerald-300">
                  2
                </span>
                手表打开后点「锁定屏幕」即可拍摄；长按 3 秒解锁。
              </p>
              <p className="flex items-start gap-2 text-white/45">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px]">
                  !
                </span>
                手表自己通常没摄像头，不必强求「手表扫码」——手机亮码 / 发链接更快。
              </p>
            </div>

            <QrBlock value={watchUrl} label="手表网页版二维码" />

            <div className="flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={() => copy(watchUrl)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 py-3 text-sm font-medium"
              >
                <Link2 className="h-4 w-4" /> 复制手表链接
              </button>
              <a
                href="/w"
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 py-3 text-sm font-bold text-black"
              >
                本机直接打开网页版 <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </section>
        )}

        {tab === 'apk' && (
          <section className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-black/35 p-5 backdrop-blur">
            <div className="space-y-2 text-sm text-white/70">
              <p>适合：手表浏览器打不开、或需要离线常驻 / 实体键 / 常亮更稳的机型。</p>
              <p className="text-white/45">
                {apkOk === true && (
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> 当前服务器已挂载 APK，可直接下。
                  </span>
                )}
                {apkOk === false && (
                  <span>
                    当前站点还没有挂载 APK。现场请在电脑跑{' '}
                    <code className="rounded bg-white/10 px-1">npm run field</code>，或从 GitHub
                    Actions / Release 取包。
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <QrBlock value={apkOk ? apkUrl : joinUrl} label="APK 下载二维码" />
              <a
                href={apkUrl}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold ${
                  apkOk ? 'bg-emerald-400 text-black' : 'bg-white/10 text-white/50'
                }`}
              >
                <Download className="h-4 w-4" />
                {apkOk ? '下载 chromawatch.apk' : 'APK 暂不可用（见上方说明）'}
              </a>
            </div>

            <ol className="space-y-2 text-xs text-white/55">
              <li>1. 手表打开「开发者选项 → ADB 调试 / 无线调试」</li>
              <li>
                2. 电脑执行 <code className="rounded bg-white/10 px-1">./wear/scripts/install.sh</code>
              </li>
              <li>3. 或用厂家伴侣 App 把 APK 推到手表</li>
            </ol>
          </section>
        )}

        {tab === 'tips' && (
          <section className="space-y-4 rounded-3xl border border-white/10 bg-black/35 p-5 text-sm text-white/70 backdrop-blur">
            <Tip
              icon={<Wifi className="h-5 w-5 text-emerald-300" />}
              title="剧组离线 / 没外网"
              body="电脑连热点后执行 npm run field，终端会打印局域网二维码。手机扫码打开接入页，再把 /w 链到手表——全程不走公网。"
            />
            <Tip
              icon={<Smartphone className="h-5 w-5 text-emerald-300" />}
              title="手表完全没浏览器"
              body="用手机打开 /w 网页版全屏，把手机临时绑在手腕 / 道具背后当绿幕；同时抽空侧载原生 APK 到下一块表。"
            />
            <Tip
              icon={<Watch className="h-5 w-5 text-emerald-300" />}
              title="剧组应急卡"
              body="把本页二维码打印成名片大小贴在器材箱。换表时助手亮码 10 秒，演员腕上就能开拍。"
            />
            <div className="rounded-2xl border border-dashed border-white/15 p-4">
              <p className="mb-2 text-xs text-white/40">本页链接（可做成贴纸 NFC / 短链）</p>
              <QrBlock value={joinUrl} label="接入页二维码" />
              <button
                type="button"
                onClick={() => copy(joinUrl)}
                className="mt-3 w-full rounded-2xl bg-white/10 py-3 text-sm"
              >
                复制接入页链接
              </button>
            </div>
          </section>
        )}

        <p className="mt-8 text-center text-[11px] text-white/30">
          ChromaWatch · 网页零安装优先，原生包作增强
        </p>
      </div>
    </div>
  );
}

function Tip({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white/5 p-4">
      <div className="mt-0.5">{icon}</div>
      <div>
        <h3 className="font-medium text-white">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-white/55">{body}</p>
      </div>
    </div>
  );
}
