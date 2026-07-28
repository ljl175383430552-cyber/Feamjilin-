/** 手表网页版 / 接入页共用的色幕与跟踪点定义（与原生 Wear 端对齐） */
export type ScreenColor =
  | 'green'
  | 'green_chroma'
  | 'blue'
  | 'blue_chroma'
  | 'red'
  | 'white'
  | 'black'
  | 'magenta';

export type MarkerStyle = 'checker' | 'bullseye' | 'cross' | 'dot';

export const SCREEN_COLORS: Record<ScreenColor, { hex: string; label: string }> = {
  green: { hex: '#00FF00', label: '数字绿' },
  green_chroma: { hex: '#00B140', label: '影视绿' },
  blue: { hex: '#0000FF', label: '数字蓝' },
  blue_chroma: { hex: '#0047BB', label: '影视蓝' },
  red: { hex: '#FF0000', label: '纯红' },
  white: { hex: '#FFFFFF', label: '纯白' },
  black: { hex: '#000000', label: '纯黑' },
  magenta: { hex: '#FF00FF', label: '品红' },
};

export const COLOR_ORDER = Object.keys(SCREEN_COLORS) as ScreenColor[];
export const MARKER_COUNTS = [0, 1, 3, 5] as const;
export const MARKER_STYLES: { id: MarkerStyle; label: string }[] = [
  { id: 'checker', label: '棋盘' },
  { id: 'bullseye', label: '同心环' },
  { id: 'cross', label: '十字' },
  { id: 'dot', label: '实心点' },
];

export const UNLOCK_HOLD_MS = 3000;
export const MIN_MARKER_PX = 12;
export const MAX_MARKER_PX = 120;

export function markerLayout(
  count: number,
  offsetX = 0,
  offsetY = 0,
): Array<{ x: number; y: number }> {
  const cx = 0.5 + offsetX;
  const cy = 0.5 + offsetY;
  const r = 0.28;
  if (count === 1) return [{ x: cx, y: cy }];
  if (count === 3) {
    return [
      { x: cx, y: cy },
      { x: cx - r, y: cy },
      { x: cx + r, y: cy },
    ];
  }
  if (count === 5) {
    const d = r * 0.7071;
    return [
      { x: cx, y: cy },
      { x: cx - d, y: cy - d },
      { x: cx + d, y: cy - d },
      { x: cx - d, y: cy + d },
      { x: cx + d, y: cy + d },
    ];
  }
  return [];
}

export function nextColor(id: ScreenColor): ScreenColor {
  const i = COLOR_ORDER.indexOf(id);
  return COLOR_ORDER[(i + 1) % COLOR_ORDER.length];
}
