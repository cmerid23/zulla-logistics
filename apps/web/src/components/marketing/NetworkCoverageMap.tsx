import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { STATE_CENTROIDS } from "./stateCentroids";
import { AnimatedSection } from "./AnimatedSection";

interface CoverageResponse {
  stateCarrierCounts: Record<string, number>;
  activeLanes: Array<{
    origin_state: string;
    dest_state: string;
    load_count: number;
    carrier_count: number;
  }>;
  equipmentByState: Record<string, Record<string, number>>;
}

export function NetworkCoverageMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const { data } = useQuery({
    queryKey: ["network", "coverage"],
    queryFn: () => api.get<CoverageResponse>("/network/coverage"),
  });

  // Initialise the map once.
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!containerRef.current || !token) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-99.3312, 31.4757], // Texas
      zoom: 3.6,
      attributionControl: false,
    });
    map.scrollZoom.disable();
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Plot data when it arrives.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data) return;

    const drawLayers = () => {
      // Lane lines.
      const laneFeatures = data.activeLanes
        .map((lane) => {
          const o = STATE_CENTROIDS[lane.origin_state];
          const d = STATE_CENTROIDS[lane.dest_state];
          if (!o || !d) return null;
          return {
            type: "Feature" as const,
            geometry: { type: "LineString" as const, coordinates: [o, d] },
            properties: {
              loads: lane.load_count,
              carriers: lane.carrier_count,
              label: `${lane.origin_state} → ${lane.dest_state}: ${lane.load_count} loads · ${lane.carrier_count} carriers`,
            },
          };
        })
        .filter(Boolean) as Array<{
          type: "Feature";
          geometry: { type: "LineString"; coordinates: number[][] };
          properties: { loads: number; carriers: number; label: string };
        }>;

      const lanesSource = map.getSource("lanes") as mapboxgl.GeoJSONSource | undefined;
      if (lanesSource) {
        lanesSource.setData({ type: "FeatureCollection", features: laneFeatures });
      } else {
        map.addSource("lanes", { type: "geojson", data: { type: "FeatureCollection", features: laneFeatures } });
        map.addLayer({
          id: "lanes-line",
          type: "line",
          source: "lanes",
          paint: {
            "line-color": "#E8FF47",
            "line-opacity": 0.45,
            "line-width": [
              "interpolate",
              ["linear"],
              ["get", "loads"],
              1, 1,
              50, 6,
            ],
          },
        });
      }

      // Carrier density circles.
      const stateFeatures = Object.entries(data.stateCarrierCounts)
        .map(([state, count]) => {
          const c = STATE_CENTROIDS[state];
          if (!c) return null;
          const equipment = data.equipmentByState[state] ?? {};
          const equipText = Object.entries(equipment)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
          return {
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: c },
            properties: {
              state,
              count,
              tooltip: `${state} · ${count} carriers${equipText ? " · " + equipText : ""}`,
            },
          };
        })
        .filter(Boolean) as Array<{
          type: "Feature";
          geometry: { type: "Point"; coordinates: number[] };
          properties: { state: string; count: number; tooltip: string };
        }>;

      const statesSource = map.getSource("states") as mapboxgl.GeoJSONSource | undefined;
      if (statesSource) {
        statesSource.setData({ type: "FeatureCollection", features: stateFeatures });
      } else {
        map.addSource("states", { type: "geojson", data: { type: "FeatureCollection", features: stateFeatures } });
        map.addLayer({
          id: "states-fill",
          type: "circle",
          source: "states",
          paint: {
            "circle-color": "#E8FF47",
            "circle-opacity": 0.55,
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "count"],
              1, 6,
              10, 14,
              50, 28,
            ],
            "circle-stroke-color": "#0A0B0D",
            "circle-stroke-width": 1.5,
          },
        });
        map.addLayer({
          id: "states-label",
          type: "symbol",
          source: "states",
          layout: {
            "text-field": ["concat", ["get", "state"], " ", ["to-string", ["get", "count"]]],
            "text-size": 11,
            "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          },
          paint: { "text-color": "#0A0B0D", "text-halo-color": "#E8FF47", "text-halo-width": 1 },
        });

        const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
        map.on("mouseenter", "states-fill", (e) => {
          const feature = e.features?.[0];
          if (!feature) return;
          const tooltip = feature.properties?.tooltip as string | undefined;
          map.getCanvas().style.cursor = "pointer";
          if (tooltip && feature.geometry.type === "Point") {
            popup
              .setLngLat(feature.geometry.coordinates as [number, number])
              .setHTML(`<div style="font-family:'DM Mono',monospace;font-size:11px;color:#0A0B0D">${tooltip}</div>`)
              .addTo(map);
          }
        });
        map.on("mouseleave", "states-fill", () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      }
    };

    if (map.isStyleLoaded()) drawLayers();
    else map.once("load", drawLayers);
  }, [data]);

  // Live counters under the map.
  const totals = useMemo(() => {
    if (!data) return { carriers: 0, states: 0, lanes: 0 };
    const carriers = Object.values(data.stateCarrierCounts).reduce((a, b) => a + b, 0);
    return {
      carriers,
      states: Object.keys(data.stateCarrierCounts).length,
      lanes: data.activeLanes.length,
    };
  }, [data]);

  return (
    <section className="bg-black py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <AnimatedSection>
          <div className="section-label mb-3">Network coverage</div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Live capacity map. <br className="hidden md:block" />
            Real loads. Real carriers.
          </h2>
        </AnimatedSection>
        <AnimatedSection delay={0.1}>
          <div ref={containerRef} className="mt-12 h-[480px] w-full overflow-hidden rounded-panel border border-white/[0.07] bg-deep" />
          <p className="mt-6 text-center font-display text-xl tracking-tight text-white/85">
            <span className="text-accent">{totals.carriers}</span> carriers active across{" "}
            <span className="text-accent">{totals.states}</span> states covering{" "}
            <span className="text-accent">{totals.lanes}</span> lanes this month.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
