import type { RGB, SkyColorResult } from "@/types/sky";

type EstimateSkyColorParams = {
  lat: number;
  lon: number;
  date?: Date;
  aod550?: number;
  humidity?: number;
  source?: string;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };
}

function dayOfYear(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = date.getTime() - start;
  return Math.floor(diff / 86400000);
}

function degToRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function radToDeg(radians: number) {
  return (radians * 180) / Math.PI;
}

export function getSolarElevation(lat: number, lon: number, date: Date = new Date()): number {
  const day = dayOfYear(date);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const gamma = (2 * Math.PI / 365) * (day - 1 + (hour - 12) / 24);

  const equationOfTime = 229.18 * (
    0.000075 +
    0.001868 * Math.cos(gamma) -
    0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) -
    0.040849 * Math.sin(2 * gamma)
  );

  const declination =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const trueSolarTime = ((hour * 60 + equationOfTime + 4 * lon) % 1440 + 1440) % 1440;
  const hourAngle = trueSolarTime / 4 < 0 ? trueSolarTime / 4 + 180 : trueSolarTime / 4 - 180;
  const latRad = degToRad(lat);
  const hourAngleRad = degToRad(hourAngle);
  const zenith = Math.acos(
    Math.sin(latRad) * Math.sin(declination) +
    Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngleRad),
  );

  return 90 - radToDeg(zenith);
}

export function getAirMass(solarElevation: number): number {
  if (solarElevation <= -6) return 40;
  const zenith = 90 - Math.max(0.1, solarElevation);
  return 1 / (Math.cos(degToRad(zenith)) + 0.50572 * Math.pow(96.07995 - zenith, -1.6364));
}

export function rgbToHex(rgb: RGB): string {
  const toHex = (value: number) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

export function estimateSkyColor(params: EstimateSkyColorParams): SkyColorResult {
  const date = params.date ?? new Date();
  const aod550 = params.aod550 ?? 0.08;
  const humidity = params.humidity ?? 0.5;
  const solarElevation = getSolarElevation(params.lat, params.lon, date);
  const airMass = getAirMass(solarElevation);

  const night: RGB = { r: 5, g: 12, b: 30 };
  const nautical: RGB = { r: 18, g: 38, b: 77 };
  const dawn: RGB = { r: 240, g: 113, b: 63 };
  const lowSun: RGB = { r: 255, g: 173, b: 87 };
  const midday: RGB = { r: 86, g: 174, b: 232 };

  let base: RGB;
  if (solarElevation < -12) {
    base = night;
  } else if (solarElevation < -4) {
    base = mix(night, nautical, (solarElevation + 12) / 8);
  } else if (solarElevation < 6) {
    base = mix(nautical, dawn, (solarElevation + 4) / 10);
  } else if (solarElevation < 18) {
    base = mix(dawn, lowSun, (solarElevation - 6) / 12);
  } else {
    const t = clamp((solarElevation - 18) / 55);
    base = mix(lowSun, midday, Math.pow(t, 0.72));
  }

  const haze = clamp(aod550 / 0.35 * 0.55 + humidity * 0.35);
  const white: RGB = { r: 244, g: 247, b: 247 };
  const rgb = mix(base, white, haze * (solarElevation > -6 ? 0.55 : 0.18));
  const brightness = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) / 255;
  const elevationScore = clamp((solarElevation + 8) / 68);
  const clarityPenalty = clamp(aod550 / 0.25 * 0.28 + humidity * 0.18);
  const skyScore = Math.round(clamp(elevationScore * 0.78 + brightness * 0.22 - clarityPenalty, 0, 1) * 100);

  const label =
    solarElevation < -8 ? "Night blue" :
    solarElevation < 4 ? "Twilight amber" :
    solarElevation < 18 ? "Low sun orange" :
    haze > 0.5 ? "Hazy blue" :
    "Clear blue";

  return {
    rgb,
    hex: rgbToHex(rgb),
    solarElevation: Number(solarElevation.toFixed(2)),
    airMass: Number(airMass.toFixed(2)),
    skyScore,
    label,
    aod550,
    humidity,
    source: params.source ?? "static",
    timestamp: date.toISOString(),
  };
}
