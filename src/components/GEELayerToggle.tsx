import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Leaf, 
  TreePine, 
  Map as MapIcon, 
  Cloud, 
  History 
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface GEELayer {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  opacity: number;
  legendColors: string[];
  legendLabels: string[];
}

interface GEELayerToggleProps {
  onLayerToggle: (layerId: string, enabled: boolean) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
}

export const GEELayerToggle: React.FC<GEELayerToggleProps> = ({
  onLayerToggle,
  onLayerOpacityChange,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [layers, setLayers] = useState<GEELayer[]>([
    {
      id: 'ndvi',
      name: 'NDVI (Vegetation Health)',
      description: 'Shows vegetation health and density',
      icon: <Leaf className="w-4 h-4" />,
      enabled: false,
      opacity: 70,
      legendColors: ['#8B4513', '#FFFF00', '#00FF00', '#006400'],
      legendLabels: ['No Vegetation', 'Low', 'Medium', 'High']
    },
    {
      id: 'landcover',
      name: 'Land Cover',
      description: 'Forest, grassland, agriculture classification',
      icon: <TreePine className="w-4 h-4" />,
      enabled: false,
      opacity: 70,
      legendColors: ['#006400', '#90EE90', '#FFD700', '#8B4513', '#4169E1'],
      legendLabels: ['Forest', 'Grassland', 'Agriculture', 'Urban', 'Water']
    },
    {
      id: 'biomass',
      name: 'Biomass Density',
      description: 'Carbon storage potential heat map',
      icon: <MapIcon className="w-4 h-4" />,
      enabled: false,
      opacity: 60,
      legendColors: ['#FFFFCC', '#FED976', '#FD8D3C', '#E31A1C', '#800026'],
      legendLabels: ['Very Low', 'Low', 'Medium', 'High', 'Very High']
    },
    {
      id: 'cloudcover',
      name: 'Cloud Coverage',
      description: 'Data quality indicator',
      icon: <Cloud className="w-4 h-4" />,
      enabled: false,
      opacity: 40,
      legendColors: ['#FFFFFF00', '#FFFFFF80', '#FFFFFFFF'],
      legendLabels: ['Clear', 'Partial', 'Cloudy']
    },
    {
      id: 'change',
      name: 'Historical Change',
      description: 'Vegetation changes over time',
      icon: <History className="w-4 h-4" />,
      enabled: false,
      opacity: 60,
      legendColors: ['#FF0000', '#FFFF00', '#00FF00'],
      legendLabels: ['Loss', 'No Change', 'Gain']
    }
  ]);

  const handleLayerToggle = (layerId: string) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId) {
        const newEnabled = !layer.enabled;
        onLayerToggle(layerId, newEnabled);
        return { ...layer, enabled: newEnabled };
      }
      return layer;
    }));
  };

  const handleOpacityChange = (layerId: string, opacity: number[]) => {
    const newOpacity = opacity[0];
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, opacity: newOpacity } : layer
    ));
    onLayerOpacityChange(layerId, newOpacity);
  };

  const enabledLayers = layers.filter(layer => layer.enabled);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-2 mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span className="font-medium">Available Layers</span>
            {enabledLayers.length > 0 && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                {enabledLayers.length}
              </span>
            )}
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-4">
        {layers.map(layer => (
          <div key={layer.id} className="space-y-3 p-3 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {layer.icon}
                <div>
                  <p className="text-sm font-medium">{layer.name}</p>
                  <p className="text-xs text-muted-foreground">{layer.description}</p>
                </div>
              </div>
              <Switch
                checked={layer.enabled}
                onCheckedChange={() => handleLayerToggle(layer.id)}
              />
            </div>
            
            {layer.enabled && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Opacity:</span>
                  <div className="flex-1">
                    <Slider
                      value={[layer.opacity]}
                      onValueChange={(value) => handleOpacityChange(layer.id, value)}
                      max={100}
                      min={0}
                      step={10}
                      className="w-full"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8">{layer.opacity}%</span>
                </div>
                
                {/* Legend */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Legend:</p>
                  <div className="grid grid-cols-1 gap-1">
                    {layer.legendColors.map((color, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded border border-border"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {layer.legendLabels[index]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {enabledLayers.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Enable layers above to visualize satellite data
            </p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};