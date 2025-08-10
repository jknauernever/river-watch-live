// ===== Datasets (single-select) =====
export type DatasetKey =
  | 'Gage height' | 'Discharge' | 'Water temperature' | 'pH'
  | 'Dissolved oxygen' | 'NO3+NO2 (as N)' | 'Turbidity'
  | 'Susp. sediment conc' | 'Specific conductance';

export const DATASETS: Record<DatasetKey, string[]> = {
  'Gage height': ['00065'],
  'Discharge': ['00060'],
  'Water temperature': ['00010'],
  'pH': ['00400'],
  'Dissolved oxygen': ['00300'],
  'NO3+NO2 (as N)': ['99133'],
  'Turbidity': ['63680'],
  'Susp. sediment conc': ['80154'],
  'Specific conductance': ['00095'],
};

export const PARAM_LABEL: Record<string,string> = {
  '00065':'Gage height',
  '00060':'Discharge',
  '00010':'Water temp',
  '00400':'pH',
  '00300':'Dissolved oxygen',
  '99133':'NO₃+NO₂ (as N)',
  '63680':'Turbidity',
  '80154':'Susp. sediment conc',
  '00095':'Specific conductance'
};

// ===== Color scales per parameter code =====
// type: sequential or diverging (for UI hints only)
export const COLOR_BY_CODE: Record<string, {type:'sequential'|'diverging', colors:{low:string, med:string, high:string}}> = {
  // 00065 — Gage height (blue scale)
  '00065': { type: 'sequential', colors: { low:'#d4f0ff', med:'#4a90e2', high:'#08306b' }},

  // 00060 — Discharge (aqua → deep teal)
  '00060': { type: 'sequential', colors: { low:'#d0f0e0', med:'#4ab0a6', high:'#004d47' }},

  // 00010 — Water temperature (cold→hot, diverging)
  '00010': { type: 'diverging',  colors: { low:'#2b83ba', med:'#ffffbf', high:'#d7191c' }},

  // 00400 — pH (acid→neutral→basic, diverging)
  '00400': { type: 'diverging',  colors: { low:'#d73027', med:'#1a9850', high:'#4575b4' }},

  // 00300 — Dissolved oxygen (gray→blue)
  '00300': { type: 'sequential', colors: { low:'#d9d9d9', med:'#80b1d3', high:'#08519c' }},

  // 99133 — Nitrate+Nitrite (traffic-light risk)
  '99133': { type: 'diverging',  colors: { low:'#1a9850', med:'#fee08b', high:'#d73027' }},

  // 63680 — Turbidity (clear→murky)
  '63680': { type: 'sequential', colors: { low:'#c7e9f1', med:'#dfc27d', high:'#8c510a' }},

  // 80154 — Susp. sediment conc (clear→muddy)
  '80154': { type: 'sequential', colors: { low:'#c6dbef', med:'#9e9ac8', high:'#54278f' }},

  // 00095 — Specific conductance (fresh→salty, diverging)
  '00095': { type: 'diverging',  colors: { low:'#2c7bb6', med:'#ffffbf', high:'#d7191c' }},
};

// ===== Quantiles + color mapping =====
export type Thresholds = { min:number; q33:number; q66:number; max:number };

export function computeThresholds(values: number[]): Thresholds | null {
  const arr = values.filter(v => Number.isFinite(v)).sort((a,b)=>a-b);
  if (!arr.length) return null;
  const q = (p:number) => {
    const pos = (arr.length - 1) * p;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return lo === hi ? arr[lo] : arr[lo] + (arr[hi]-arr[lo])*(pos-lo);
  };
  return { min: arr[0], q33: q(0.33), q66: q(0.66), max: arr[arr.length-1] };
}

export function colorForValue(paramCode: string, value: number, th: Thresholds | null): string {
  const scale = COLOR_BY_CODE[paramCode]?.colors;
  if (!scale || !Number.isFinite(value) || !th) return '#4a90e2'; // fallback
  if (value <= th.q33) return scale.low;
  if (value >= th.q66) return scale.high;
  return scale.med;
}

// Convenience for legend labels
export function legendTicks(th: Thresholds | null, unit?: string) {
  if (!th) return '';
  const fmt = (n:number) => {
    // crude rounding; swap for per-parameter formatting if you like
    if (Math.abs(n) >= 1000) return n.toFixed(0);
    if (Math.abs(n) >= 10)   return n.toFixed(1);
    return n.toFixed(2);
  };
  const u = unit ? ` ${unit}` : '';
  return `${fmt(th.min)} | ${fmt(th.q33)} | ${fmt(th.q66)} | ${fmt(th.max)}${u}`;
}
