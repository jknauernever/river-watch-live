import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { COLOR_BY_CODE, PARAM_LABEL } from '@/lib/datasets';
import { usgsService } from '@/services/usgs-api';
import { aggregateMonthly, downsampleEven, TV, pickUnit, formatTimestamp, formatValueWithUnit } from '@/lib/popup-utils';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const formatDateTick = (t: number, mode: '14d'|'year') => {
  const d = new Date(t);
  return mode === 'year'
    ? d.toLocaleDateString(undefined, { month: 'short' })
    : `${d.getMonth()+1}/${d.getDate()}`;
};

const SiteDetails: React.FC = () => {
  const [params] = useSearchParams();
  const siteId = params.get('siteId') || '';
  const name = params.get('name') || `Site ${siteId || ''}`;
  const lat = params.get('lat');
  const lng = params.get('lng');
  const activeCode = params.get('code') || '00065';
  const site = useMemo(() => ({ siteId, name, coordinates: [Number(lng), Number(lat)] as [number, number] }), [siteId, name, lat, lng]);

  const [mode, setMode] = useState<'14d'|'year'>('14d');
  const [series, setSeries] = useState<TV[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const unit = pickUnit(activeCode, undefined);

  useEffect(() => {
    const title = `${name} — ${PARAM_LABEL[activeCode] || activeCode} | Gauge details`;
    document.title = title.slice(0, 60);
    const descText = `${PARAM_LABEL[activeCode] || activeCode} at ${name} (${siteId})`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', descText.slice(0, 160));
    // canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;
  }, [name, activeCode, siteId]);

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
          const s = await usgsService.fetchObservationsSeries(siteId, activeCode, start, now, ac.signal);
          if (ac.signal.aborted) return;
          setSeries(downsampleEven(s, 2000));
        } else {
          const daily = await usgsService.fetchDailyMeansSeries(siteId, activeCode, start, now, ac.signal);
          if (ac.signal.aborted) return;
          let months = aggregateMonthly(daily);
          if ((!months || months.length === 0)) {
            const obs = await usgsService.fetchObservationsSeries(siteId, activeCode, start, now, ac.signal);
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
  }, [siteId, activeCode, mode]);

  const chartData = useMemo(() => (series || []).map(d => ({ t: d.t, v: d.v })), [series]);

  const color = COLOR_BY_CODE[activeCode]?.colors.high || 'hsl(var(--primary))';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="container mx-auto p-4">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{name}</h1>
            <p className="text-sm text-muted-foreground">{PARAM_LABEL[activeCode] || activeCode} · {siteId}{lat && lng ? ` · ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              className="text-xs px-3 py-2 rounded border hover:bg-accent"
              href={`https://waterdata.usgs.gov/monitoring-location/${siteId.replace(/^USGS[:\-]?/i,'')}`}
              target="_blank" rel="noreferrer"
            >View on USGS</a>
            <Link to="/" className="text-xs px-3 py-2 rounded border hover:bg-accent">Back to map</Link>
          </div>
        </header>
        <Separator className="my-4" />

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="inline-flex items-center rounded border overflow-hidden text-xs" role="tablist" aria-label="History range">
                <button className={`px-2 py-1 ${mode==='14d'?'bg-accent':''}`} onClick={()=>setMode('14d')} role="tab" aria-selected={mode==='14d'}>14 days</button>
                <button className={`px-2 py-1 ${mode==='year'?'bg-accent':''}`} onClick={()=>setMode('year')} role="tab" aria-selected={mode==='year'}>Past year</button>
              </div>
              <div className="text-xs text-muted-foreground">Unit: {unit || 'n/a'}</div>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading chart…</div>
            )}
            {error && <div className="text-sm text-destructive">{error}</div>}
            {chartData.length > 0 && !loading && !error && (
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(t) => formatDateTick(t as number, mode)}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      domain={['auto','auto']}
                      width={50}
                      tickFormatter={(v) => {
                        const a = Math.abs(Number(v));
                        if (a >= 1000) return Number(v).toFixed(0);
                        if (a >= 10) return Number(v).toFixed(1);
                        return Number(v).toFixed(2);
                      }}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      labelFormatter={(t) => formatTimestamp(new Date(t as number).toISOString())}
                      formatter={(v: any) => [`${formatValueWithUnit(activeCode, v as number, unit)}`, `${PARAM_LABEL[activeCode] || activeCode}`]}
                    />
                    <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {chartData.length === 0 && !loading && !error && (
              <div className="text-sm text-muted-foreground">No data in this period.</div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default SiteDetails;
