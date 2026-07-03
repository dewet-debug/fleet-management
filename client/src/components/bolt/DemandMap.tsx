import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface PickupZone {
  lat: number;
  lng: number;
  count: number;
  sampleAddress: string | null;
}

// Keyless OSM raster style (fine for an internal tool). Attribution required.
const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
} as unknown as maplibregl.StyleSpecification;

export default function DemandMap({ zones }: { zones: PickupZone[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // init once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [28.0473, -26.2041], // Johannesburg
      zoom: 9,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // update data when zones change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const geojson = {
      type: 'FeatureCollection',
      features: zones.map((z) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [z.lng, z.lat] },
        properties: { count: z.count },
      })),
    };
    const maxCount = Math.max(1, ...zones.map((z) => z.count));

    const apply = () => {
      const src = map.getSource('demand') as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData(geojson as never);
      } else {
        map.addSource('demand', { type: 'geojson', data: geojson as never });
        map.addLayer({
          id: 'demand-circles',
          type: 'circle',
          source: 'demand',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 4, maxCount, 28],
            'circle-color': ['interpolate', ['linear'], ['get', 'count'], 1, '#8fb0cd', maxCount, '#244066'],
            'circle-opacity': 0.7,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff',
          },
        });
      }
      if (zones.length) {
        const b = new maplibregl.LngLatBounds();
        zones.forEach((z) => b.extend([z.lng, z.lat]));
        map.fitBounds(b, { padding: 36, maxZoom: 12, duration: 0 });
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [zones]);

  return <div ref={containerRef} className="h-full w-full" />;
}
