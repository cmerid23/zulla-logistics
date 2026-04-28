import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Props {
  pings: Array<{ lat: number; lng: number; pingedAt?: string }>;
  height?: number;
}

export function TrackingMap({ pings, height = 360 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!containerRef.current || !token) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: pings[0] ? [pings[0].lng, pings[0].lat] : [-98, 39],
      zoom: pings[0] ? 6 : 3,
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pings.length) return;
    pings.forEach((p) => new mapboxgl.Marker().setLngLat([p.lng, p.lat]).addTo(map));
    if (pings[0]) map.flyTo({ center: [pings[0].lng, pings[0].lat], zoom: 8 });
  }, [pings]);

  return <div ref={containerRef} style={{ height }} className="w-full rounded-xl" />;
}
