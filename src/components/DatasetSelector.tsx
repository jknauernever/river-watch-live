import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Database, Loader2, Minimize2, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Dataset {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters?: Record<string, any>;
}

interface DatasetSelectorProps {
  onDatasetSelect: (dataset: Dataset) => void;
  selectedDataset?: Dataset | null;
}

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  onDatasetSelect,
  selectedDataset
}) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching datasets via Supabase edge function...');
      const { data, error } = await supabase.functions.invoke('get-datasets');
      
      if (error) {
        throw new Error(`Supabase function error: ${error.message}`);
      }
      console.log('API Response:', data);
      
      // Ensure we have a valid array of datasets
      const datasetsArray = Array.isArray(data.datasets) ? data.datasets : 
                           Array.isArray(data) ? data : [];
      
      console.log('Processed datasets:', datasetsArray);
      setDatasets(datasetsArray);
      
      // Auto-expand first category if datasets exist
      if (datasetsArray.length > 0) {
        const firstCategory = datasetsArray[0].category;
        setExpandedCategories({ [firstCategory]: true });
      }
      
      toast.success(`Loaded ${datasetsArray.length} datasets`);
    } catch (error) {
      console.error('Error fetching datasets:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch datasets');
      toast.error('Failed to load datasets from API');
      // Ensure datasets is always an array even on error
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  };

  // Group datasets by category - ensure datasets is always an array
  const groupedDatasets = Array.isArray(datasets) ? datasets.reduce((groups, dataset) => {
    const category = dataset.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(dataset);
    return groups;
  }, {} as Record<string, Dataset[]>) : {};

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleDatasetSelect = (dataset: Dataset) => {
    onDatasetSelect(dataset);
    toast.success(`Selected dataset: ${dataset.name}`);
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, string> = {
      'Vegetation': '🌱',
      'Water': '💧',
      'Climate': '🌡️',
      'Landcover': '🗺️',
      'Elevation': '⛰️',
      'Urban': '🏙️',
      'Other': '📊'
    };
    return iconMap[category] || '📊';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Dataset Selector
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading datasets...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Dataset Selector
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchDatasets} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Dataset Selector
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
        {selectedDataset && !isCollapsed && (
          <Badge variant="secondary" className="w-fit">
            Selected: {selectedDataset.name}
          </Badge>
        )}
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-2">
          {Object.entries(groupedDatasets).length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No datasets available
          </div>
        ) : (
          Object.entries(groupedDatasets).map(([category, categoryDatasets]) => (
            <Collapsible
              key={category}
              open={expandedCategories[category]}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-2 h-auto hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span>{getCategoryIcon(category)}</span>
                    <span className="font-medium">{category}</span>
                    <Badge variant="outline" className="ml-2">
                      {categoryDatasets.length}
                    </Badge>
                  </div>
                  {expandedCategories[category] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-1 mt-1">
                {categoryDatasets.map((dataset) => (
                  <Button
                    key={dataset.id}
                    variant={selectedDataset?.id === dataset.id ? "default" : "outline"}
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => handleDatasetSelect(dataset)}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium">{dataset.name}</span>
                      {dataset.description && (
                        <span className="text-xs opacity-70 line-clamp-2">
                          {dataset.description}
                        </span>
                      )}
                    </div>
                  </Button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
        
        {datasets && datasets.length > 0 && (
          <div className="pt-2 border-t border-border">
            <Button 
              onClick={fetchDatasets} 
              variant="ghost" 
              size="sm"
              className="w-full"
            >
              🔄 Refresh Datasets
            </Button>
          </div>
        )}
        </CardContent>
      )}
    </Card>
  );
};