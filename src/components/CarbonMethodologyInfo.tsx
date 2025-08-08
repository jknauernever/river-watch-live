import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Satellite, TreePine, Calculator, Database, TrendingUp } from "lucide-react";

export const CarbonMethodologyInfo = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center justify-center p-1 rounded-full hover:bg-muted transition-colors">
          <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Carbon Storage Calculation Methodology
          </DialogTitle>
          <DialogDescription>
            Detailed technical documentation of our enhanced satellite-based carbon estimation approach
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Methodology Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Our carbon storage estimation uses a multi-stage approach combining satellite remote sensing, 
                land cover classification, and vegetation health indices to provide accurate carbon storage estimates 
                across different ecosystem types.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">NDVI-Based</Badge>
                <Badge variant="secondary">Land Cover Weighted</Badge>
                <Badge variant="secondary">Ecosystem-Specific</Badge>
                <Badge variant="secondary">Quality Assessed</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Data Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Satellite className="h-5 w-5" />
                Primary Data Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-primary">Sentinel-2 Satellite Data</h4>
                    <ul className="space-y-1 text-muted-foreground ml-4">
                      <li>• 10m spatial resolution multispectral imagery</li>
                      <li>• 5-day revisit frequency</li>
                      <li>• NDVI (Normalized Difference Vegetation Index)</li>
                      <li>• Quality-filtered composite creation</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary">Copernicus Global Land Cover</h4>
                    <ul className="space-y-1 text-muted-foreground ml-4">
                      <li>• 10m resolution land cover classification</li>
                      <li>• Annual global coverage updates</li>
                      <li>• 11 primary land cover classes</li>
                      <li>• Accuracy: 80-85% globally validated</li>
                    </ul>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-primary">SoilGrids 2.0</h4>
                    <ul className="space-y-1 text-muted-foreground ml-4">
                      <li>• Global soil organic carbon density</li>
                      <li>• 250m resolution (interpolated to 10m)</li>
                      <li>• Multiple depth intervals (0-30cm focus)</li>
                      <li>• Machine learning predictions</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary">Processing Platform</h4>
                    <ul className="space-y-1 text-muted-foreground ml-4">
                      <li>• Google Earth Engine cloud computing</li>
                      <li>• Automated cloud masking</li>
                      <li>• Temporal compositing algorithms</li>
                      <li>• Polygon-based zonal statistics</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calculation Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TreePine className="h-5 w-5" />
                Calculation Methodology
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold text-primary">Step 1: Satellite Data Processing</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Extract annual NDVI composites from Sentinel-2 using quality-filtered pixels. 
                    Calculate mean NDVI and standard deviation across the property boundary to assess 
                    vegetation health and consistency.
                  </p>
                  <div className="mt-2 text-xs bg-muted p-2 rounded">
                    <strong>Formula:</strong> NDVI = (NIR - Red) / (NIR + Red)<br/>
                    <strong>Quality Threshold:</strong> Cloud coverage &lt; 20%, Scene classification Band used
                  </div>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold text-green-700">Step 2: Land Cover Classification</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Apply Copernicus Global Land Cover data to determine ecosystem type distribution 
                    within the property boundary. Each land cover type has specific carbon storage characteristics.
                  </p>
                  <div className="mt-2 text-xs bg-muted p-2 rounded">
                    <strong>Classes:</strong> Dense Forest, Grassland, Agricultural, Sparse Vegetation<br/>
                    <strong>Processing:</strong> Zonal statistics within polygon boundary
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-blue-700">Step 3: Carbon Coefficient Application</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Apply ecosystem-specific carbon storage coefficients modulated by NDVI values. 
                    Higher NDVI indicates healthier, more productive vegetation with greater carbon storage.
                  </p>
                  <div className="mt-2 text-xs bg-muted p-2 rounded space-y-1">
                    <div><strong>Dense Forest:</strong> 140-320 t CO₂e/ha (NDVI-dependent)</div>
                    <div><strong>Grassland:</strong> 60-120 t CO₂e/ha (NDVI-dependent)</div>
                    <div><strong>Agricultural:</strong> 30-110 t CO₂e/ha (NDVI-dependent)</div>
                    <div><strong>Sparse Vegetation:</strong> 20-80 t CO₂e/ha (NDVI-dependent)</div>
                  </div>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold text-purple-700">Step 4: Carbon Pool Distribution</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Distribute total carbon across three main pools based on dominant ecosystem type. 
                    Each ecosystem has characteristic carbon allocation patterns.
                  </p>
                  <div className="mt-2 text-xs bg-muted p-2 rounded">
                    <div className="grid grid-cols-3 gap-2 text-center font-semibold">
                      <div>Soil Organic</div>
                      <div>Above-Ground</div>
                      <div>Below-Ground</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mt-1">
                      <div>42-70%</div>
                      <div>20-45%</div>
                      <div>10-15%</div>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold text-orange-700">Step 5: Quality Assessment & Uncertainty</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Calculate uncertainty ranges based on data quality indicators including cloud coverage, 
                    NDVI variability, and input data resolution.
                  </p>
                  <div className="mt-2 text-xs bg-muted p-2 rounded">
                    <div><strong>High Quality:</strong> ±10% (Cloud &lt; 10%, NDVI std &lt; 0.2)</div>
                    <div><strong>Medium Quality:</strong> ±20% (Cloud 10-20%, NDVI std 0.2-0.3)</div>
                    <div><strong>Low Quality:</strong> ±35% (Cloud &gt; 20%, NDVI std &gt; 0.3)</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scientific References */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5" />
                Scientific References & Standards
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div>
                <h4 className="font-semibold">International Standards</h4>
                <ul className="text-muted-foreground space-y-1 ml-4">
                  <li>• IPCC 2019 Refinement to the 2006 IPCC Guidelines for National Greenhouse Gas Inventories</li>
                  <li>• Good Practice Guidance for Land Use, Land-Use Change and Forestry (IPCC, 2003)</li>
                  <li>• ISO 14064-2:2019 - Greenhouse gases specification for validation and verification</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold">Key Research Publications</h4>
                <ul className="text-muted-foreground space-y-1 ml-4">
                  <li>• Avitabile et al. (2016). "An integrated pan-tropical biomass map using multiple reference datasets"</li>
                  <li>• Santoro et al. (2021). "The global forest above-ground biomass pool for 2010 estimated from high-resolution satellite observations"</li>
                  <li>• Hengl et al. (2017). "SoilGrids250m: Global gridded soil information based on machine learning"</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold">Validation & Accuracy</h4>
                <ul className="text-muted-foreground space-y-1 ml-4">
                  <li>• Cross-validation with ground-truth forest inventory data</li>
                  <li>• Comparison with national forest carbon assessments</li>
                  <li>• Continuous algorithm refinement based on field measurements</li>
                  <li>• Regular model performance evaluation against independent datasets</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Limitations */}
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg text-amber-700">Important Limitations & Considerations</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <ul className="text-muted-foreground space-y-1">
                <li>• Current implementation uses enhanced modeling approach pending full GEE integration</li>
                <li>• Carbon estimates represent potential storage capacity under current conditions</li>
                <li>• Results should be validated with ground-truth measurements for precise carbon credit applications</li>
                <li>• Seasonal variations and recent disturbances may not be fully captured</li>
                <li>• Soil carbon estimates have higher uncertainty than biomass estimates</li>
                <li>• Results are suitable for landscape-level carbon assessment and planning</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};