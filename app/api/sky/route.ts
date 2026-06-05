import { NextResponse } from "next/server";
import { atmosphereProvider } from "@/lib/atmosphereProvider";
import { estimateSkyColor } from "@/lib/skyColor";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required numbers" }, { status: 400 });
  }

  const date = new Date();
  const atmosphere = await atmosphereProvider.getAtmosphere(lat, lon, date);
  return NextResponse.json(estimateSkyColor({ lat, lon, date, ...atmosphere }));
}
