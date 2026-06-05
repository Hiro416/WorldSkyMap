import type { GeocodeResult } from "@/types/sky";
import { majorCities } from "@/data/cities";

type NominatimResult = {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
};

export function fallbackGeocode(query: string): GeocodeResult[] {
  const normalized = query.trim().toLowerCase();
  const matches = majorCities.filter((city) => city.name.toLowerCase().includes(normalized || "sendai"));
  return matches.slice(0, 6).map((city) => ({
    id: city.id,
    name: city.name,
    displayName: city.name,
    lat: city.lat,
    lon: city.lon,
  }));
}

export async function geocode(query: string): Promise<GeocodeResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "1");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const email = process.env.NOMINATIM_EMAIL;
  const userAgent = `SkyAtlas/0.1 (${appUrl}${email ? `; ${email}` : ""})`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      "Accept-Language": "en,ja;q=0.9",
    },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    throw new Error(`Nominatim returned ${response.status}`);
  }

  const data = await response.json() as NominatimResult[];
  return data.map((item) => ({
    id: String(item.place_id),
    name: item.name ?? item.display_name.split(",")[0] ?? "Unknown",
    displayName: item.display_name,
    lat: Number(item.lat),
    lon: Number(item.lon),
  }));
}
