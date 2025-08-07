export interface USGSMonitoringLocation {
  id: string;
  properties: {
    name: string;
    site_id: string;
    coordinates: [number, number]; // [lng, lat]
    agency_cd?: string;
    site_type_cd?: string;
    huc_cd?: string;
    data_type_cd?: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number];
  };
}

export interface USGSLatestValue {
  id: string;
  properties: {
    monitoring_location_id: string;
    parameter_code: string;
    parameter_name: string;
    value: number;
    unit_of_measurement: string;
    datetime: string;
    qualifiers?: string[];
  };
}

export interface WaterLevel {
  value: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  color: string;
}

export interface GaugeStation {
  id: string;
  name: string;
  siteId: string;
  coordinates: [number, number];
  latestHeight?: number;
  latestDischarge?: number;
  waterLevel: WaterLevel;
  lastUpdated?: string;
}

export interface USGSHistoricalData {
  properties: {
    monitoring_location_id: string;
    parameter_code: string;
    datetime: string;
    value: number;
    unit_of_measurement: string;
  };
}