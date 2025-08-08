import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Map, ChevronDown } from "lucide-react";

interface BaseMapOption {
  id: string;
  name: string;
  style: string | null;
  description: string;
  category: 'Standard' | 'Satellite' | 'Navigation' | 'Special';
}

interface BaseMapSelectorProps {
  selectedBaseMap: string;
  onBaseMapChange: (baseMapId: string) => void;
}

const baseMapOptions: BaseMapOption[] = [
  // Special option
  {
    id: 'none',
    name: 'None (White)',
    style: null,
    description: 'White background only',
    category: 'Special'
  },
  // Standard styles
  {
    id: 'streets',
    name: 'Streets',
    style: 'mapbox://styles/mapbox/streets-v12',
    description: 'Default street map',
    category: 'Standard'
  },
  {
    id: 'outdoors',
    name: 'Outdoors',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    description: 'Outdoor activities map',
    category: 'Standard'
  },
  {
    id: 'light',
    name: 'Light',
    style: 'mapbox://styles/mapbox/light-v11',
    description: 'Light colored base map',
    category: 'Standard'
  },
  {
    id: 'dark',
    name: 'Dark',
    style: 'mapbox://styles/mapbox/dark-v11',
    description: 'Dark colored base map',
    category: 'Standard'
  },
  // Satellite styles
  {
    id: 'satellite',
    name: 'Satellite',
    style: 'mapbox://styles/mapbox/satellite-v9',
    description: 'Satellite imagery',
    category: 'Satellite'
  },
  {
    id: 'satellite-streets',
    name: 'Satellite Streets',
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    description: 'Satellite with street labels',
    category: 'Satellite'
  },
  // Navigation styles
  {
    id: 'navigation-day',
    name: 'Navigation Day',
    style: 'mapbox://styles/mapbox/navigation-day-v1',
    description: 'Optimized for navigation',
    category: 'Navigation'
  },
  {
    id: 'navigation-night',
    name: 'Navigation Night',
    style: 'mapbox://styles/mapbox/navigation-night-v1',
    description: 'Night mode navigation',
    category: 'Navigation'
  }
];

export const BaseMapSelector: React.FC<BaseMapSelectorProps> = ({
  selectedBaseMap,
  onBaseMapChange
}) => {
  const currentBaseMap = baseMapOptions.find(option => option.id === selectedBaseMap);
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Satellite': return '🛰️';
      case 'Navigation': return '🧭';
      case 'Special': return '⚪';
      default: return '🗺️';
    }
  };

  const groupedOptions = baseMapOptions.reduce((groups, option) => {
    const category = option.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(option);
    return groups;
  }, {} as Record<string, BaseMapOption[]>);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-[140px] justify-between">
          <div className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            <span className="truncate">{currentBaseMap?.name || 'Base Map'}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-56">
        {Object.entries(groupedOptions).map(([category, options], categoryIndex) => (
          <div key={category}>
            {categoryIndex > 0 && <DropdownMenuSeparator />}
            
            {/* Category Header */}
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
              <span>{getCategoryIcon(category)}</span>
              <span>{category}</span>
            </div>
            
            {/* Category Options */}
            {options.map((option) => (
              <DropdownMenuItem
                key={option.id}
                onClick={() => onBaseMapChange(option.id)}
                className={`cursor-pointer ${selectedBaseMap === option.id ? 'bg-accent' : ''}`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.name}</span>
                    {selectedBaseMap === option.id && (
                      <span className="text-xs text-primary">✓</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};