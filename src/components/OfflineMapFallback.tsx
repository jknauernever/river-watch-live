import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Droplets, MapPin, RotateCcw, AlertTriangle } from 'lucide-react';

interface GaugeLocation {
  id: string;
  name: string;
  coordinates: [number, number];
  waterLevel: {
    value: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    color: string;
  };
}

const demoGauges: GaugeLocation[] = [
  {
    id: 'DEMO001',
    name: 'Demo River at Main St',
    coordinates: [-122.2, 47.7],
    waterLevel: { value: 3.2, level: 'medium', color: '#34a853' }
  },
  {
    id: 'DEMO002', 
    name: 'Demo Creek near Bridge',
    coordinates: [-122.4, 47.6],
    waterLevel: { value: 1.8, level: 'low', color: '#4285f4' }
  },
  {
    id: 'DEMO003',
    name: 'Demo Lake Outlet',
    coordinates: [-122.1, 47.8],
    waterLevel: { value: 7.5, level: 'high', color: '#ea4335' }
  },
  {
    id: 'DEMO004',
    name: 'Demo Stream at Park',
    coordinates: [-122.3, 47.9],
    waterLevel: { value: 12.1, level: 'critical', color: '#ff6d01' }
  },
  {
    id: 'DEMO005',
    name: 'Demo River below Dam',
    coordinates: [-122.5, 47.5],
    waterLevel: { value: 4.2, level: 'medium', color: '#34a853' }
  }
];

export const OfflineMapFallback = () => {
  const [selectedGauge, setSelectedGauge] = useState<GaugeLocation | null>(null);

  return (
    <div className="relative w-full h-screen bg-background">
      {/* Header with status */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800">Demo Mode</h3>
              <p className="text-sm text-yellow-700">
                API quotas exceeded. Showing demo data until service resumes.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main content area */}
      <div className="pt-24 pb-4 px-4 h-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          
          {/* Gauge List */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold">River Gauges - Demo Data</h2>
                </div>
              </div>
              <div className="divide-y max-h-[calc(100vh-200px)] overflow-y-auto">
                {demoGauges.map((gauge) => (
                  <div
                    key={gauge.id}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedGauge?.id === gauge.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedGauge(gauge)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <h3 className="font-medium">{gauge.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Site ID: {gauge.id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {gauge.coordinates[1].toFixed(4)}, {gauge.coordinates[0].toFixed(4)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: gauge.waterLevel.color }}
                          />
                          <Badge 
                            variant="secondary"
                            className="text-xs"
                            style={{ 
                              backgroundColor: `${gauge.waterLevel.color}20`,
                              color: gauge.waterLevel.color 
                            }}
                          >
                            {gauge.waterLevel.level.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm font-mono">
                          {gauge.waterLevel.value.toFixed(1)} ft
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Details Panel */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b bg-muted/50">
                <h2 className="font-semibold">Gauge Details</h2>
              </div>
              {selectedGauge ? (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{selectedGauge.name}</h3>
                    <p className="text-muted-foreground">Site ID: {selectedGauge.id}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Current Height
                      </label>
                      <p className="text-2xl font-bold">
                        {selectedGauge.waterLevel.value.toFixed(1)} ft
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Water Level
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: selectedGauge.waterLevel.color }}
                        />
                        <p 
                          className="font-semibold capitalize"
                          style={{ color: selectedGauge.waterLevel.color }}
                        >
                          {selectedGauge.waterLevel.level}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Coordinates
                    </label>
                    <p className="text-lg font-mono">
                      {selectedGauge.coordinates[1].toFixed(4)}°N, {selectedGauge.coordinates[0].toFixed(4)}°W
                    </p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground text-center">
                      📊 Historical data and real-time updates will be available when API service resumes
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Select a gauge from the list to view details
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Legend */}
      <Card className="absolute bottom-4 left-4 z-10">
        <CardContent className="p-3">
          <div className="flex items-center gap-1 mb-2">
            <Droplets className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Water Levels</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4285f4' }}></div>
              <span>Low (&lt; 2 ft)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#34a853' }}></div>
              <span>Medium (2-5 ft)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ea4335' }}></div>
              <span>High (5-10 ft)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff6d01' }}></div>
              <span>Critical (&gt; 10 ft)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gauge count */}
      <div className="absolute bottom-4 right-4 z-10">
        <Badge variant="secondary">
          {demoGauges.length} demo gauges
        </Badge>
      </div>
    </div>
  );
};