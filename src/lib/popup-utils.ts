// Popup-specific formatting utilities
import { PARAM_UNIT, COLOR_BY_CODE } from '@/lib/datasets';

const nf0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const nf3 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 });

export function pickUnit(code: string, apiUnit?: string) {
  if (apiUnit && apiUnit !== '' && apiUnit !== '_FNU') return apiUnit;
  return (PARAM_UNIT as any)?.[code] || apiUnit || '';
}

export function formatValue(code: string, raw: unknown): string {
  const v = Number(raw);
  if (!Number.isFinite(v)) return String(raw ?? '');
  switch (code) {
    case '00065':
      return nf2.format(v);
    case '00060':
      return Math.abs(v) >= 10 ? nf0.format(v) : nf1.format(v);
    case '00010':
      return nf1.format(v);
    case '00400':
      return nf2.format(v);
    case '00300':
      return nf1.format(v);
    case '99133':
      return Math.abs(v) < 0.1 ? nf3.format(v) : nf2.format(v);
    case '63680':
      return Math.abs(v) >= 100 ? nf0.format(v) : nf1.format(v);
    case '80154':
      return Math.abs(v) >= 100 ? nf0.format(v) : nf1.format(v);
    case '00095':
      return Math.abs(v) >= 1000 ? nf0.format(v) : nf1.format(v);
    default: {
      if (Math.abs(v) < 10) return nf2.format(v);
      if (Math.abs(v) < 100) return nf1.format(v);
      return nf0.format(v);
    }
  }
}

export function formatValueWithUnit(code: string, raw: unknown, apiUnit?: string) {
  const u = pickUnit(code, apiUnit);
  const val = formatValue(code, raw);
  return u && u.toLowerCase() !== 'ph' ? `${val} ${u}` : `${val}`;
}

export function formatTimestamp(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export type TV = { t: number; v: number };

export function downsampleEven(series: TV[], maxPts = 600) {
  if (series.length <= maxPts) return series;
  const step = Math.ceil(series.length / maxPts);
  const out: TV[] = [];
  for (let i = 0; i < series.length; i += step) out.push(series[i]);
  return out;
}

export function toMonthKey(ts: number) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function aggregateMonthly(daily: TV[]): TV[] {
  const buckets = new Map<string, number[]>();
  for (const d of daily) {
    const k = toMonthKey(d.t);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(d.v);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, arr]) => {
      const avg = arr.reduce((s, x) => s + x, 0) / arr.length;
      const [y, m] = k.split('-').map(Number);
      return { t: Date.UTC(y, m - 1, 1), v: avg };
    });
}

export function gradientCssForCode(code: string) {
  const c = COLOR_BY_CODE[code]?.colors;
  if (!c) return 'linear-gradient(to right, #d4f0ff, #4a90e2, #08306b)';
  return `linear-gradient(to right, ${c.low}, ${c.med}, ${c.high})`;
}
