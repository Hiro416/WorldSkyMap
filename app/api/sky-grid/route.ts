import { NextResponse } from "next/server";
import { majorCities } from "@/data/cities";
import { atmosphereProvider } from "@/lib/atmosphereProvider";
import { estimateSkyColor } from "@/lib/skyColor";
import type { SkyPoint } from "@/types/sky";

export const dynamic = "force-dynamic";

function parseBbox(value: string | null) {
  if (!value) return null;
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  const [minLon, minLat, maxLon, maxLat] = parts;
  return { minLon, minLat, maxLon, maxLat };
}

function inBbox(lat: number, lon: number, bbox: NonNullable<ReturnType<typeof parseBbox>>) {
  return lat >= bbox.minLat && lat <= bbox.maxLat && lon >= bbox.minLon && lon <= bbox.maxLon;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bbox = parseBbox(searchParams.get("bbox"));
  const zoom = Number(searchParams.get("zoom") ?? "2");

  if (!bbox) {
    return NextResponse.json({ error: "bbox must be minLon,minLat,maxLon,maxLat" }, { status: 400 });
  }

  const date = new Date();
  const atmosphere = await atmosphereProvider.getAtmosphere(0, 0, date);
  const useGrid = zoom >= 5;
  const points: SkyPoint[] = [];

  if (useGrid) {
    const lonSpan = Math.max(0.01, bbox.maxLon - bbox.minLon);
    const latSpan = Math.max(0.01, bbox.maxLat - bbox.minLat);
    const columns = Math.min(12, Math.max(4, Math.round(zoom + 1)));
    const rows = Math.min(8, Math.max(3, Math.round(columns * latSpan / lonSpan)));

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const lon = bbox.minLon + lonSpan * ((x + 0.5) / columns);
        const lat = bbox.minLat + latSpan * ((y + 0.5) / rows);
        points.push({
          id: `grid-${x}-${y}`,
          lat,
          lon,
          ...estimateSkyColor({ lat, lon, date, ...atmosphere }),
        });
      }
    }
  } else {
    for (const city of majorCities) {
      if (!inBbox(city.lat, city.lon, bbox)) continue;
      points.push({
        id: city.id,
        name: city.name,
        lat: city.lat,
        lon: city.lon,
        ...estimateSkyColor({ lat: city.lat, lon: city.lon, date, ...atmosphere }),
      });
    }
  }

  return NextResponse.json({ mode: useGrid ? "grid" : "cities", points });
}
