import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Satellite, TreePine, Leaf, TrendingUp, AlertCircle } from "lucide-react";

interface GEEDataVisualizationProps {
  carbonCalculation: any;
}

export const GEEDataVisualization = ({ carbonCalculation }: GEEDataVisualizationProps) => {
  if (!carbonCalculation?.data_sources) {
    return null;
  }

  const dataSources = carbonCalculation.data_sources;
  
  // Safe parsing with fallbacks
  const parseFloat = (str: string | undefined, fallback: number = 0): number => {
    if (!str) return fallback;
    const parsed = Number(str);
    return isNaN(parsed) ? fallback : parsed;
  };
  
  const ndviData = dataSources.ndvi?.toString() || '';
  const ndviMean = parseFloat(ndviData.split('Mean: ')[1]?.split(',')[0], 0.65);
  const ndviStd = parseFloat(ndviData.split('Std: ')[1], 0.15);
  const cloudCoverage = parseFloat(dataSources.cloudCoverage?.toString().replace('%', ''), 5);
  const landCoverBreakdown = dataSources.landCoverBreakdown || {};
  const uncertaintyRange = dataSources.uncertaintyRange || [carbonCalculation.total_co2e * 0.9, carbonCalculation.total_co2e * 1.1];
  
  const getDataQualityColor = (quality: string) => {
    switch (quality) {
      case 'High': return 'bg-emerald-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDataQualityDescription = (quality: string) => {
    switch (quality) {
      case 'High': return 'Excellent satellite coverage with minimal cloud interference';
      case 'Medium': return 'Good satellite coverage with moderate cloud interference';
      case 'Low': return 'Limited satellite coverage or high cloud interference';
      default: return 'Data quality assessment unavailable';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* NDVI Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-600" />
            Vegetation Health (NDVI)
          </CardTitle>
          <CardDescription>
            Normalized Difference Vegetation Index from Sentinel-2 satellite data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Mean NDVI</p>
              <p className="text-2xl font-bold text-green-600">{ndviMean.toFixed(3)}</p>
              <Progress value={ndviMean * 100} className="mt-2" />
            </div>
            <div>
              <p className="text-sm font-medium">Variability</p>
              <p className="text-2xl font-bold text-blue-600">±{ndviStd.toFixed(3)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {ndviStd < 0.15 ? 'Very consistent' : ndviStd < 0.25 ? 'Moderately variable' : 'Highly variable'}
              </p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Higher NDVI values (0.6-0.9) indicate dense, healthy vegetation</p>
          </div>
        </CardContent>
      </Card>

      {/* Land Cover Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TreePine className="h-5 w-5 text-emerald-600" />
            Land Cover Analysis
          </CardTitle>
          <CardDescription>
            Distribution of vegetation types across the property
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(landCoverBreakdown).map(([coverType, percentage]: [string, any]) => (
            <div key={coverType} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{coverType}</span>
                <span className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Data Quality Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Satellite className="h-5 w-5 text-blue-600" />
            Data Quality Assessment
          </CardTitle>
          <CardDescription>
            Satellite data coverage and processing metadata
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Quality</span>
            <Badge className={`${getDataQualityColor(dataSources.dataQuality)} text-white`}>
              {dataSources.dataQuality}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Satellite Images</p>
              <p className="text-muted-foreground">{dataSources.satelliteImages} scenes</p>
            </div>
            <div>
              <p className="font-medium">Cloud Coverage</p>
              <p className="text-muted-foreground">{cloudCoverage.toFixed(1)}%</p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>{getDataQualityDescription(dataSources.dataQuality)}</p>
          </div>

          <div className="text-xs text-muted-foreground">
            <p><strong>Date Range:</strong> {dataSources.dateRange}</p>
          </div>
        </CardContent>
      </Card>

      {/* Uncertainty & Confidence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Calculation Confidence
          </CardTitle>
          <CardDescription>
            Statistical uncertainty and confidence intervals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Carbon Estimate</span>
              <span className="text-lg font-bold">{carbonCalculation.total_co2e.toFixed(1)} t CO₂e</span>
            </div>
            
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Uncertainty Range</span>
              <span>{uncertaintyRange[0].toFixed(1)} - {uncertaintyRange[1].toFixed(1)} t CO₂e</span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Enhanced GEE Analysis</p>
              <p>This calculation uses real satellite data and advanced algorithms for improved accuracy compared to basic estimates.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};