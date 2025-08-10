import React, { useEffect, useMemo, useRef, useState } from 'react';
import { COLOR_BY_CODE, PARAM_LABEL, legendTicks, Thresholds } from '@/lib/datasets';
import { usgsService } from '@/services/usgs-api';
import { aggregateMonthly, downsampleEven, formatTimestamp, formatValueWithUnit, gradientCssForCode, pickUnit, TV } from '@/lib/popup-utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SitePopupProps {
  site: { siteId: string; name: string; coordinates: [number, number]; siteType?: string };
  attributes: Record<string, any> | null;
  latestFeatures: any[];
  activeCode: string;
  thresholds: Thresholds | null;
  onCenter?: () => void;
}

export const SitePopup: React.FC<SitePopupProps> = ({ site, attributes, latestFeatures, activeCode, thresholds, onCenter }) => {
  const [mode, setMode] = useState<'14d'|'year'>('14d');
  const [series, setSeries] = useState<TV[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const rows = useMemo(() => {
    const feats = Array.isArray(latestFeatures) ? latestFeatures : [];
    const byCode = new Map<string, { code: string; label: string; unit?: string; time?: string; value?: number }>();
    for (const f of feats) {
      const p = f?.properties || {};
      const code: string | undefined = p.parameter_code || p.observed_property_code;
      if (!code) continue;
      const label: string = p.parameter_name || p.observed_property_name || PARAM_LABEL[code] || code;
      const unit: string | undefined = p.unit || p.unit_of_measurement || p.unit_of_measure || undefined;
      const time: string | undefined = p.time || p.datetime || p.result_time || undefined;
      const valueNum = Number(p.value ?? p.result);
      const value = Number.isFinite(valueNum) ? valueNum : undefined;
      const ex = byCode.get(code);
      if (!ex) byCode.set(code, { code, label, unit, time, value });
    }
    const arr = Array.from(byCode.values());
    // Sort: active first, then A-Z by label
    arr.sort((a,b)=> (a.code===activeCode? -1: b.code===activeCode? 1: a.label.localeCompare(b.label)));
    return arr;
  }, [latestFeatures, activeCode]);

  const activeUnit = useMemo(() => {
    const r = rows.find(r => r.code === activeCode);
    return pickUnit(activeCode, r?.unit);
  }, [rows, activeCode]);

  const facts = useMemo(() => {
    const a = attributes || {} as any;
    const countyState = [a.county_name, a.state_name].filter(Boolean).join(', ');
    const items: Array<{ label: string; value: string }> = [];
    if (a.altitude != null && a.altitude !== '') items.push({ label: 'Elevation', value: `${a.altitude} ft` });
    if (a.drainage_area != null && a.drainage_area !== '') items.push({ label: 'Drainage area', value: `${a.drainage_area} mi²` });
    const huc = a.hydrologic_unit_code || a.hydrologic_unit || a.hydrologic_unit_name;
    if (huc) items.push({ label: 'HUC', value: String(huc) });
    if (countyState) items.push({ label: 'County/State', value: countyState });
    if (a.time_zone_abbreviation) items.push({ label: 'Time zone', value: a.time_zone_abbreviation });
    return items;
  }, [attributes]);

  useEffect(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true); setError(null); setSeries(null);
    const now = new Date();
    const start = mode === '14d' ? new Date(Date.now() - 14*24*3600*1000) : new Date(Date.now() - 365*24*3600*1000);
    const run = async () => {
      try {
        if (mode === '14d') {
          const s = await usgsService.fetchObservationsSeries(site.siteId, activeCode, start, now, ac.signal);
          if (ac.signal.aborted) return;
          setSeries(downsampleEven(s, 600));
        } else {
          const daily = await usgsService.fetchDailyMeansSeries(site.siteId, activeCode, start, now, ac.signal);
          if (ac.signal.aborted) return;
          let months = aggregateMonthly(daily);
          if ((!months || months.length === 0)) {
            // Fallback: use observations and aggregate monthly
            const obs = await usgsService.fetchObservationsSeries(site.siteId, activeCode, start, now, ac.signal);
            if (ac.signal.aborted) return;
            months = aggregateMonthly(obs);
          }
          setSeries(months);
        }
      } catch (e: any) {
        if (ac.signal.aborted) return;
        setError('Failed to load chart');
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    };
    run();
    return () => ac.abort();
  }, [site.siteId, activeCode, mode]);

  // Simple sparkline SVG
  const Sparkline = ({ data, height=56, padding=4 }: { data: TV[]; height?: number; padding?: number }) => {
    const width = 220;
    const h = height; const w = width;
    if (!data || data.length === 0) return <div className="text-xs text-muted-foreground">No data in this period.</div>;
    const xs = data.map(d=>d.t), ys = data.map(d=>d.v);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const x = (t:number)=> padding + (w-2*padding) * (x1===x0? 0 : (t-x0)/(x1-x0));
    const y = (v:number)=> (h-padding) - (h-2*padding) * (y1===y0? 0.5 : (v-y0)/(y1-y0));
    const d = data.map((pt,i)=> `${i?'L':'M'}${x(pt.t).toFixed(1)},${y(pt.v).toFixed(1)}`).join(' ');
    const stroke = COLOR_BY_CODE[activeCode]?.colors.high || '#0ea5e9';
    return (
      <svg width={w} height={h} role="img" aria-label={`${PARAM_LABEL[activeCode] || activeCode} history`}>
        <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
    );
  };

  return (
    <div className="p-3 max-w-sm text-foreground">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate" title={site.name}>{site.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {site.coordinates[1].toFixed(4)}, {site.coordinates[0].toFixed(4)} · {site.siteType || 'Site'}
          </div>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(site.siteId)}
          className="text-xs px-2 py-1 rounded-full border bg-background hover:bg-accent"
          aria-label="Copy site ID"
          title="Copy ID"
        >{site.siteId}</button>
      </div>

      {/* Measurements */}
      <div className="mt-3 space-y-2">
        {rows.length === 0 && (
          <div className="text-sm text-muted-foreground">No recent measurements.</div>
        )}
        {rows.map((r) => {
          const color = r.code === activeCode && Number.isFinite(r.value!) && thresholds
            ? (r.value! <= thresholds.q33 ? COLOR_BY_CODE[activeCode].colors.low : r.value! >= thresholds.q66 ? COLOR_BY_CODE[activeCode].colors.high : COLOR_BY_CODE[activeCode].colors.med)
            : '#94a3b8';
          const bin = r.code === activeCode && Number.isFinite(r.value!) && thresholds
            ? (r.value! <= thresholds.q33 ? 'Low' : r.value! >= thresholds.q66 ? 'High' : 'Med')
            : '';
          return (
            <div key={r.code} className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              <div className="flex-1 min-w-0 text-sm truncate" title={`${r.label} (${r.code})`}>
                <span className="font-medium">{r.label}</span> <span className="text-muted-foreground">({r.code})</span>
              </div>
              <div className="text-sm font-mono">{formatValueWithUnit(r.code, r.value, r.unit)}</div>
              <div className="text-xs text-muted-foreground ml-2">{formatTimestamp(r.time)}</div>
              {bin && <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded-full border" title="Bin">{bin}</span>}
            </div>
          );
        })}
      </div>

      {/* Quick facts */}
      {facts.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium mb-1">Quick facts</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {facts.map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground truncate">{f.label}</span>
                <span className="font-medium truncate">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3">
        <div className="text-xs font-medium mb-1">Legend</div>
        <div className="h-2 rounded" style={{ background: gradientCssForCode(activeCode) }} />
        <div className="text-[10px] text-muted-foreground mt-1">{legendTicks(thresholds, activeUnit)}</div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        <a
          className="text-xs px-2 py-1 rounded border hover:bg-accent"
          href={`https://waterdata.usgs.gov/monitoring-location/${site.siteId.replace(/^USGS[:\-]?/i,'')}`}
          target="_blank" rel="noreferrer" aria-label="View on USGS"
        >View on USGS</a>
        <button className="text-xs px-2 py-1 rounded border hover:bg-accent" onClick={onCenter} aria-label="Center map here">Center here</button>
        <button className="text-xs px-2 py-1 rounded border hover:bg-accent" onClick={() => navigator.clipboard.writeText(site.siteId)} aria-label="Copy site ID">Copy ID</button>
      </div>

      {/* More details (raw attributes) */}
      {attributes && (
        <Collapsible>
          <CollapsibleTrigger className="mt-2 text-xs underline underline-offset-2">More details</CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 max-h-40 overflow-auto pr-1">
              <div className="space-y-1 text-xs">
                {Object.entries(attributes)
                  .filter(([_, v]) => v !== null && v !== '' && typeof v !== 'object')
                  .slice(0, 200)
                  .map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground truncate">{k}</span>
                      <span className="font-mono truncate">{String(v)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Mini chart */}
      <div className="mt-3">
        <div className="inline-flex items-center rounded border overflow-hidden text-xs" role="tablist" aria-label="History range">
          <button className={`px-2 py-1 ${mode==='14d'?'bg-accent':''}`} onClick={()=>setMode('14d')} role="tab" aria-selected={mode==='14d'}>14 days</button>
          <button className={`px-2 py-1 ${mode==='year'?'bg-accent':''}`} onClick={()=>setMode('year')} role="tab" aria-selected={mode==='year'}>Past year</button>
        </div>
        <div className="mt-2">
          {loading && <div className="text-xs text-muted-foreground">Loading chart…</div>}
          {error && <div className="text-xs text-destructive">{error}</div>}
          {series && !loading && !error && <Sparkline data={series} />}
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          {mode==='14d'
            ? `14 days of ${PARAM_LABEL[activeCode] || activeCode} (${activeUnit || ''})`
            : `Monthly mean ${PARAM_LABEL[activeCode] || activeCode} — past 12 months`}
        </div>
      </div>
    </div>
  );
};
