"use client";

import type { GeocodeResult, SkyColorResult } from "@/types/sky";

type SkyColorCardProps = {
  place: GeocodeResult;
  sky: SkyColorResult | null;
};

export default function SkyColorCard({ place, sky }: SkyColorCardProps) {
  return (
    <section className="skyCard" aria-label="Current sky color">
      <div className="skySwatch" style={{ backgroundColor: sky?.hex ?? "#5AAEE8" }} />
      <div className="skyCardHeader">
        <div>
          <p className="eyebrow">Selected sky</p>
          <h1>{place.name}</h1>
          <p>{place.lat.toFixed(4)}, {place.lon.toFixed(4)}</p>
        </div>
        <strong>{sky?.hex ?? "--"}</strong>
      </div>
      <div className="metricGrid">
        <div><span>RGB</span><strong>{sky ? `${sky.rgb.r}, ${sky.rgb.g}, ${sky.rgb.b}` : "--"}</strong></div>
        <div><span>Solar Elev.</span><strong>{sky ? `${sky.solarElevation.toFixed(2)} deg` : "--"}</strong></div>
        <div><span>Air Mass</span><strong>{sky ? sky.airMass.toFixed(2) : "--"}</strong></div>
        <div><span>Sky Score</span><strong>{sky ? `${sky.skyScore}/100` : "--"}</strong></div>
      </div>
      <p className="skyLabel">{sky?.label ?? "Loading sky estimate"}</p>
    </section>
  );
}
