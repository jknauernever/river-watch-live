import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Dataset {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters?: Record<string, any>;
}

interface ActiveDataset {
  dataset: Dataset;
  opacity: number;
  visible: boolean;
}

interface DatasetTransparencyControlsProps {
  activeDatasets: Record<string, ActiveDataset>;
  onOpacityChange: (datasetId: string, opacity: number) => void;
  onVisibilityToggle: (datasetId: string) => void;
  onRemoveDataset: (datasetId: string) => void;
}

const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, string> = {
    'Vegetation': '🌱',
    'Water': '💧',
    'Climate': '🌡️',
    'Landcover': '🗺️',
    'Elevation': '⛰️',
    'Urban': '🏙️',
    'Land Use': '🗺️',
    'Cryosphere': '❄️',
    'Hazards': '🔥',
    'Other': '📊'
  };
  return iconMap[category] || '📊';
};

const getCategoryColor = (category: string) => {
  const colorMap: Record<string, string> = {
    'Vegetation': 'bg-green-100 text-green-800',
    'Water': 'bg-blue-100 text-blue-800',
    'Climate': 'bg-orange-100 text-orange-800',
    'Landcover': 'bg-purple-100 text-purple-800',
    'Elevation': 'bg-gray-100 text-gray-800',
    'Urban': 'bg-red-100 text-red-800',
    'Land Use': 'bg-indigo-100 text-indigo-800',
    'Cryosphere': 'bg-cyan-100 text-cyan-800',
    'Hazards': 'bg-yellow-100 text-yellow-800',
    'Other': 'bg-slate-100 text-slate-800'
  };
  return colorMap[category] || 'bg-slate-100 text-slate-800';
};

export const DatasetTransparencyControls: React.FC<DatasetTransparencyControlsProps> = ({
  activeDatasets,
  onOpacityChange,
  onVisibilityToggle,
  onRemoveDataset
}) => {
  const activeDatasetsArray = Object.entries(activeDatasets);

  if (activeDatasetsArray.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4" />
          Active Layers ({activeDatasetsArray.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeDatasetsArray.map(([datasetId, activeDataset]) => (
          <div key={datasetId} className="space-y-3 p-3 bg-muted/30 rounded-lg">
            {/* Dataset Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-sm">{getCategoryIcon(activeDataset.dataset.category)}</span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-sm truncate">{activeDataset.dataset.name}</h4>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getCategoryColor(activeDataset.dataset.category)}`}
                  >
                    {activeDataset.dataset.category}
                  </Badge>
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onVisibilityToggle(datasetId)}
                  className="h-7 w-7 p-0"
                  title={activeDataset.visible ? "Hide layer" : "Show layer"}
                >
                  {activeDataset.visible ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3 opacity-50" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveDataset(datasetId)}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  title="Remove layer"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Opacity removed - always full opacity */}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};