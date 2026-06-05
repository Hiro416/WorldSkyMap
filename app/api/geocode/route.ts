import { NextResponse } from "next/server";
import { fallbackGeocode, geocode } from "@/lib/geocode";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await geocode(q);
    return NextResponse.json({ results: results.length ? results : fallbackGeocode(q), source: "nominatim" });
  } catch (error) {
    console.error("geocode fallback", error);
    return NextResponse.json({ results: fallbackGeocode(q), source: "fallback" });
  }
}
