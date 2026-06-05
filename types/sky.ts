export type RGB = {
  r: number;
  g: number;
  b: number;
};

export type SkyColorResult = {
  rgb: RGB;
  hex: string;
  solarElevation: number;
  airMass: number;
  skyScore: number;
  label: string;
  aod550: number;
  humidity: number;
  source: string;
  timestamp: string;
};

export type SkyPoint = SkyColorResult & {
  id: string;
  name?: string;
  lat: number;
  lon: number;
};

export type GeocodeResult = {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lon: number;
};

export type TimelinePoint = SkyColorResult & {
  hour: string;
};
