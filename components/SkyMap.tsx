"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map, type Marker, type StyleSpecification } from "maplibre-gl";
import SearchBox from "@/components/SearchBox";
import SkyColorCard from "@/components/SkyColorCard";
import TimelineGradient from "@/components/TimelineGradient";
import { estimateSkyColor } from "@/lib/skyColor";
import type { GeocodeResult, SkyColorResult, SkyPoint, TimelinePoint } from "@/types/sky";

const initialPlace: GeocodeResult = {
  id: "sendai",
  name: "Sendai",
  displayName: "Sendai, Miyagi, Japan",
  lat: 38.2682,
  lon: 140.8694,
};

const baseMapStyle: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    },
  },
  layers: [
    {
      id: "carto-light",
      type: "raster",
      source: "carto",
      paint: {
        "raster-opacity": 0.72,
        "raster-saturation": -1,
        "raster-contrast": -0.12,
        "raster-brightness-min": 0.18,
        "raster-brightness-max": 0.96,
      },
    },
  ],
};

export default function SkyMap() {
  const mapNode = useRef<HTMLDivElement | null>(null);
  const skyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const selectedMarkerRef = useRef<Marker | null>(null);
  const fieldFrameRef = useRef<number | null>(null);
  const [query, setQuery] = useState("Sendai");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<GeocodeResult>(initialPlace);
  const [sky, setSky] = useState<SkyColorResult | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Click the map or search a place.");
  const [gridMode, setGridMode] = useState("cities");

  const selectedLngLat = useMemo(() => [selectedPlace.lon, selectedPlace.lat] as [number, number], [selectedPlace]);

  const drawSkyField = useCallback(() => {
    const map = mapRef.current;
    const canvas = skyCanvasRef.current;
    if (!map || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const pixelWidth = Math.max(1, Math.floor(width * scale));
    const pixelHeight = Math.max(1, Math.floor(height * scale));

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.68;

    const date = new Date();
    const cell = Math.max(10, Math.min(22, Math.round(26 - map.getZoom() * 2)));
    for (let y = -cell; y < height + cell; y += cell) {
      for (let x = -cell; x < width + cell; x += cell) {
        const center = map.unproject([x + cell / 2, y + cell / 2]);
        const color = estimateSkyColor({
          lat: center.lat,
          lon: center.lng,
          date,
          aod550: 0.08,
          humidity: 0.5,
          source: "client-field",
        });
        ctx.fillStyle = color.hex;
        ctx.fillRect(x, y, cell + 1, cell + 1);
      }
    }

    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.45, Math.max(width, height) * 0.75);
    vignette.addColorStop(0, "rgba(255,255,255,0.08)");
    vignette.addColorStop(1, "rgba(10,18,30,0.16)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }, []);

  const scheduleSkyField = useCallback(() => {
    if (fieldFrameRef.current !== null) {
      cancelAnimationFrame(fieldFrameRef.current);
    }
    fieldFrameRef.current = requestAnimationFrame(() => {
      fieldFrameRef.current = null;
      drawSkyField();
    });
  }, [drawSkyField]);

  const loadSky = useCallback(async (place: GeocodeResult) => {
    const [skyResponse, timelineResponse] = await Promise.all([
      fetch(`/api/sky?lat=${place.lat}&lon=${place.lon}`),
      fetch(`/api/timeline?lat=${place.lat}&lon=${place.lon}`),
    ]);
    if (!skyResponse.ok || !timelineResponse.ok) throw new Error("Sky API failed");
    const skyData = await skyResponse.json() as SkyColorResult;
    const timelineData = await timelineResponse.json() as { timeline: TimelinePoint[] };
    setSky(skyData);
    setTimeline(timelineData.timeline);
  }, []);

  const selectPlace = useCallback((place: GeocodeResult, fly = true) => {
    setSelectedPlace(place);
    setQuery(place.name);
    setResults([]);
    setStatus(`${place.name} selected.`);
    if (fly) {
      mapRef.current?.flyTo({ center: [place.lon, place.lat], zoom: Math.max(mapRef.current.getZoom(), 5), essential: true });
    }
  }, []);

  const search = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setStatus("Searching places...");
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
      const data = await response.json() as { results: GeocodeResult[]; source?: string };
      setResults(data.results);
      if (data.results[0]) {
        selectPlace(data.results[0]);
      } else {
        setStatus("No matching place was found.");
      }
    } catch {
      setStatus("Search failed. Try a major city name.");
    } finally {
      setLoading(false);
    }
  }, [query, selectPlace]);

  const refreshGrid = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(",");
    const zoom = map.getZoom();
    try {
      const response = await fetch(`/api/sky-grid?bbox=${bbox}&zoom=${zoom.toFixed(1)}`);
      const data = await response.json() as { mode: string; points: SkyPoint[] };
      setGridMode(data.mode);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = data.points.map((point) => {
        const el = document.createElement("button");
        el.className = "skyPoint";
        el.style.background = point.hex;
        el.title = point.name ? `${point.name} ${point.hex}` : point.hex;
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          selectPlace({
            id: point.id,
            name: point.name ?? `${point.lat.toFixed(2)}, ${point.lon.toFixed(2)}`,
            displayName: point.name ?? "Grid sky point",
            lat: point.lat,
            lon: point.lon,
          }, false);
        });
        return new maplibregl.Marker({ element: el })
          .setLngLat([point.lon, point.lat])
          .addTo(map);
      });
    } catch {
      setStatus("Sky points could not be refreshed.");
    }
  }, [selectPlace]);

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapNode.current,
      style: baseMapStyle,
      center: [initialPlace.lon, initialPlace.lat],
      zoom: 4.5,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    map.on("load", () => {
      refreshGrid();
      scheduleSkyField();
    });
    map.on("move", scheduleSkyField);
    map.on("zoom", scheduleSkyField);
    map.on("resize", scheduleSkyField);
    map.on("moveend", () => {
      refreshGrid();
      scheduleSkyField();
    });
    map.on("click", (event) => {
      selectPlace({
        id: `map-${event.lngLat.lat}-${event.lngLat.lng}`,
        name: "Selected point",
        displayName: "Selected from map",
        lat: event.lngLat.lat,
        lon: event.lngLat.lng,
      }, false);
    });
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      selectedMarkerRef.current?.remove();
      if (fieldFrameRef.current !== null) {
        cancelAnimationFrame(fieldFrameRef.current);
      }
      map.remove();
      mapRef.current = null;
    };
  }, [refreshGrid, scheduleSkyField, selectPlace]);

  useEffect(() => {
    const onResize = () => scheduleSkyField();
    window.addEventListener("resize", onResize);
    const interval = window.setInterval(scheduleSkyField, 5 * 60 * 1000);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearInterval(interval);
    };
  }, [scheduleSkyField]);

  useEffect(() => {
    loadSky(selectedPlace).catch(() => setStatus("Sky data failed, but the map remains usable."));
  }, [loadSky, selectedPlace]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    selectedMarkerRef.current?.remove();
    const el = document.createElement("div");
    el.className = "selectedPin";
    el.style.background = sky?.hex ?? "#ffffff";
    selectedMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat(selectedLngLat)
      .addTo(map);
  }, [selectedLngLat, sky]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus("Current location is not available in this browser.");
      return;
    }
    setStatus("Locating...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        selectPlace({
          id: "current-location",
          name: "Current location",
          displayName: "Browser geolocation",
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => setStatus("Location permission was denied or unavailable."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <main className="appShell">
      <div className="mapLayer" ref={mapNode} aria-label="World sky color map" />
      <canvas className="skyFieldCanvas" ref={skyCanvasRef} aria-hidden="true" />
      <div className="topBar">
        <div className="brandBlock">
          <p>SkyAtlas</p>
          <span>{gridMode === "grid" ? "Continuous sky field with grid samples" : "Continuous sky field with city samples"}</span>
        </div>
        <button className="locationButton" type="button" onClick={useCurrentLocation}>Current</button>
      </div>
      <div className="controlColumn">
        <SearchBox
          query={query}
          results={results}
          loading={loading}
          onQueryChange={setQuery}
          onSubmit={search}
          onSelect={selectPlace}
        />
        <SkyColorCard place={selectedPlace} sky={sky} />
        <TimelineGradient timeline={timeline} />
        <p className="statusLine">{status}</p>
      </div>
    </main>
  );
}
