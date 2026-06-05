"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map, type Marker } from "maplibre-gl";
import SearchBox from "@/components/SearchBox";
import SkyColorCard from "@/components/SkyColorCard";
import TimelineGradient from "@/components/TimelineGradient";
import type { GeocodeResult, SkyColorResult, SkyPoint, TimelinePoint } from "@/types/sky";

const initialPlace: GeocodeResult = {
  id: "sendai",
  name: "Sendai",
  displayName: "Sendai, Miyagi, Japan",
  lat: 38.2682,
  lon: 140.8694,
};

export default function SkyMap() {
  const mapNode = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const selectedMarkerRef = useRef<Marker | null>(null);
  const [query, setQuery] = useState("Sendai");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<GeocodeResult>(initialPlace);
  const [sky, setSky] = useState<SkyColorResult | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Click the map or search a place.");
  const [gridMode, setGridMode] = useState("cities");

  const selectedLngLat = useMemo(() => [selectedPlace.lon, selectedPlace.lat] as [number, number], [selectedPlace]);

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
      style: "https://demotiles.maplibre.org/style.json",
      center: [initialPlace.lon, initialPlace.lat],
      zoom: 4.5,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    map.on("load", refreshGrid);
    map.on("moveend", refreshGrid);
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
      map.remove();
      mapRef.current = null;
    };
  }, [refreshGrid, selectPlace]);

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
      <div className="topBar">
        <div className="brandBlock">
          <p>SkyAtlas</p>
          <span>{gridMode === "grid" ? "Grid sky points" : "Major city sky points"}</span>
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
