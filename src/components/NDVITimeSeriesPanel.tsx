import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CalendarIcon, MapPinIcon, TrendingUpIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NDVIDataPoint {
  date: Date;
  ndvi: number;
}

interface NDVIData {
  timeSeries: NDVIDataPoint[];
  location: { latitude: number; longitude: number };
  dateRange: { startDate: string; endDate: string };
  totalPoints: number;
}

interface NDVITimeSeriesPanelProps {
  selectedCoordinates?: [number, number] | null;
}

export const NDVITimeSeriesPanel: React.FC<NDVITimeSeriesPanelProps> = ({ 
  selectedCoordinates 
}) => {
  const [latitude, setLatitude] = useState(selectedCoordinates?.[1]?.toString() || '37.0');
  const [longitude, setLongitude] = useState(selectedCoordinates?.[0]?.toString() || '-120.0');
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2023-12-31');
  const [loading, setLoading] = useState(false);
  const [ndviData, setNdviData] = useState<NDVIData | null>(null);

  // Update coordinates when prop changes
  React.useEffect(() => {
    if (selectedCoordinates) {
      setLongitude(selectedCoordinates[0].toString());
      setLatitude(selectedCoordinates[1].toString());
    }
  }, [selectedCoordinates]);

  const fetchNDVITimeSeries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gee-ndvi-timeseries', {
        body: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          startDate,
          endDate
        }
      });

      if (error) throw error;

      if (data.success) {
        // Convert date strings back to Date objects and format for chart
        const formattedData = {
          ...data.data,
          timeSeries: data.data.timeSeries.map((point: any) => ({
            ...point,
            date: new Date(point.date),
            formattedDate: new Date(point.date).toLocaleDateString()
          }))
        };
        
        setNdviData(formattedData);
        toast.success(`Retrieved ${data.data.totalPoints} NDVI data points`);
      } else {
        throw new Error(data.error || 'Failed to fetch NDVI data');
      }
    } catch (error) {
      console.error('NDVI fetch error:', error);
      toast.error(`Failed to fetch NDVI data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5" />
            NDVI Time Series Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="latitude" className="flex items-center gap-1">
                <MapPinIcon className="h-4 w-4" />
                Latitude
              </Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="37.0"
              />
            </div>
            <div>
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="-120.0"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={fetchNDVITimeSeries} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Fetching NDVI Data...' : 'Get NDVI Time Series'}
          </Button>
        </CardContent>
      </Card>

      {ndviData && (
        <Card>
          <CardHeader>
            <CardTitle>NDVI Over Time</CardTitle>
            <p className="text-sm text-muted-foreground">
              Location: {ndviData.location.latitude.toFixed(6)}, {ndviData.location.longitude.toFixed(6)} | 
              Points: {ndviData.totalPoints}
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ndviData.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="formattedDate"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    domain={[-1, 1]}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    labelFormatter={(value) => `Date: ${value}`}
                    formatter={(value: number) => [value.toFixed(3), 'NDVI']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ndvi" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
              <p><strong>NDVI Analysis:</strong></p>
              <p>• Values range from -1 to +1</p>
              <p>• Higher values (0.3-0.8) indicate healthy vegetation</p>
              <p>• Lower values (0.0-0.3) indicate sparse or stressed vegetation</p>
              <p>• Negative values typically indicate water or bare soil</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};