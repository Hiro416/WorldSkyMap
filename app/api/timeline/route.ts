import { NextResponse } from "next/server";
import { atmosphereProvider } from "@/lib/atmosphereProvider";
import { estimateSkyColor } from "@/lib/skyColor";
import type { TimelinePoint } from "@/types/sky";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required numbers" }, { status: 400 });
  }

  const now = new Date();
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  const atmosphere = await atmosphereProvider.getAtmosphere(lat, lon, now);
  const timeline: TimelinePoint[] = Array.from({ length: 24 }, (_, index) => {
    const date = new Date(start.getTime() + index * 60 * 60 * 1000);
    return {
      ...estimateSkyColor({ lat, lon, date, ...atmosphere }),
      hour: date.toISOString(),
    };
  });

  return NextResponse.json({ timeline });
}
