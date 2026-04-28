import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Props {
  origin?: { lat: number; lng: number; label?: string };
  destination?: { lat: number; lng: number; label?: string };
  height?: number;
}

export function RouteMap({ origin, destination, height = 360 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!containerRef.current || !token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: origin ? [origin.lng, origin.lat] : [-98, 39],
      zoom: 4,
    });

    if (origin) new mapboxgl.Marker({ color: "#4f46e5" }).setLngLat([origin.lng, origin.lat]).addTo(map);
    if (destination) new mapboxgl.Marker({ color: "#10b981" }).setLngLat([destination.lng, destination.lat]).addTo(map);

    if (origin && destination) {
      const bounds = new mapboxgl.LngLatBounds(
        [origin.lng, origin.lat],
        [origin.lng, origin.lat],
      );
      bounds.extend([destination.lng, destination.lat]);
      map.fitBounds(bounds, { padding: 60 });
    }

    return () => map.remove();
  }, [origin, destination]);

  return <div ref={containerRef} style={{ height }} className="w-full rounded-xl" />;
}
