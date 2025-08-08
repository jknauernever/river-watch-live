import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TreePine, Wheat, Mountain, Download, FileText } from "lucide-react";
import { useProperty } from "@/hooks/useProperty";
import { GEEDataVisualization } from "./GEEDataVisualization";
import { CarbonMethodologyInfo } from "./CarbonMethodologyInfo";

export const CarbonResults = () => {
  const { selectedProperty, carbonCalculation } = useProperty();

  if (!selectedProperty || !carbonCalculation) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Carbon Storage Results</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Select a property and calculate its carbon storage to see detailed results here.
          </p>
          {/* Debug info */}
          <div className="mt-4 text-xs text-muted-foreground">
            Selected Property: {selectedProperty ? 'Yes' : 'No'} | 
            Carbon Calculation: {carbonCalculation ? 'Yes' : 'No'}
          </div>
        </div>
      </div>
    );
  }

  const totalCO2e = carbonCalculation.total_co2e;
  const aboveGroundBiomass = carbonCalculation.above_ground_biomass;
  const belowGroundBiomass = carbonCalculation.below_ground_biomass;
  const soilOrganicCarbon = carbonCalculation.soil_organic_carbon;
  const area = selectedProperty.area_hectares;
  const carbonPerHa = totalCO2e / area;

  const carbonPools = [
    {
      name: "Soil Organic Carbon",
      value: soilOrganicCarbon,
      percentage: (soilOrganicCarbon / totalCO2e) * 100,
      icon: Mountain,
      color: "bg-amber-500",
      description: "Carbon stored in soil organic matter"
    },
    {
      name: "Above-Ground Biomass", 
      value: aboveGroundBiomass,
      percentage: (aboveGroundBiomass / totalCO2e) * 100,
      icon: TreePine,
      color: "bg-green-500",
      description: "Carbon in trees, shrubs, and vegetation"
    },
    {
      name: "Below-Ground Biomass",
      value: belowGroundBiomass, 
      percentage: (belowGroundBiomass / totalCO2e) * 100,
      icon: Wheat,
      color: "bg-green-700",
      description: "Carbon in roots and underground biomass"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-4">Carbon Storage Results</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Detailed breakdown of CO₂ equivalent storage across all carbon pools on your selected property.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Total Carbon Summary */}
        <Card className="lg:col-span-1 border-primary/20 bg-gradient-earth">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2">
              <CardTitle className="text-2xl text-primary">Total Carbon Storage</CardTitle>
              <CarbonMethodologyInfo />
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">
                {totalCO2e.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">tonnes CO₂e</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white/50 rounded-lg p-3">
                <div className="font-semibold text-primary">{area} ha</div>
                <div className="text-muted-foreground">Total Area</div>
              </div>
              <div className="bg-white/50 rounded-lg p-3">
                <div className="font-semibold text-primary">{carbonPerHa.toFixed(1)}</div>
                <div className="text-muted-foreground">CO₂e/ha</div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button className="flex-1" size="sm">
                <Download className="w-4 h-4 mr-2" />
                PDF Report
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                CSV Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Carbon Pool Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Carbon Pool Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {carbonPools.map((pool, index) => {
              const Icon = pool.icon;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${pool.color}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">{pool.name}</div>
                        <div className="text-sm text-muted-foreground">{pool.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{pool.value.toFixed(1)} t CO₂e</div>
                      <div className="text-sm text-muted-foreground">{pool.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                  <Progress value={pool.percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced GEE Data Visualization */}
      <GEEDataVisualization carbonCalculation={carbonCalculation} />

      {/* Enhanced Methodology */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Enhanced GEE Calculation Methodology</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-6 text-sm">
          <div className="space-y-2">
            <h4 className="font-semibold text-primary">Satellite Data Sources</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Sentinel-2 NDVI (10m resolution)</li>
              <li>• Copernicus Global Land Cover (10m)</li>
              <li>• SoilGrids 2.0 soil carbon data</li>
              <li>• Google Earth Engine processing</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-primary">Advanced Models</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• NDVI-based allometric equations</li>
              <li>• Land cover specific coefficients</li>
              <li>• Temporal NDVI compositing</li>
              <li>• Cloud masking and quality filtering</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-primary">Quality Assurance</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Statistical uncertainty quantification</li>
              <li>• Multi-temporal data validation</li>
              <li>• Automated quality scoring</li>
              <li>• Peer-reviewed methodologies</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};