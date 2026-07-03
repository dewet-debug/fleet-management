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

// `hi` is forced > 1 so the interpolate input stops are strictly ascending even
// when every zone has count 1 (MapLibre throws on duplicate/descending stops).
const radiusExpr = (hi: number) =>
  ['interpolate', ['linear'], ['get', 'count'], 1, 4, hi, 28] as unknown as maplibregl.ExpressionSpecification;
const colorExpr = (hi: number) =>
  ['interpolate', ['linear'], ['get', 'count'], 1, '#8fb0cd', hi, '#244066'] as unknown as maplibregl.ExpressionSpecification;

function renderZones(map: maplibregl.Map, zones: PickupZone[]) {
  const geojson = {
    type: 'FeatureCollection',
    features: zones.map((z) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [z.lng, z.lat] },
      properties: { count: z.count },
    })),
  };
  const hi = Math.max(2, ...zones.map((z) => z.count));

  const src = map.getSource('demand') as maplibregl.GeoJSONSource | undefined;
  if (src) {
    src.setData(geojson as never);
    // scale is data-dependent, so re-apply the paint expressions on every update
    map.setPaintProperty('demand-circles', 'circle-radius', radiusExpr(hi));
    map.setPaintProperty('demand-circles', 'circle-color', colorExpr(hi));
  } else {
    map.addSource('demand', { type: 'geojson', data: geojson as never });
    map.addLayer({
      id: 'demand-circles',
      type: 'circle',
      source: 'demand',
      paint: {
        'circle-radius': radiusExpr(hi),
        'circle-color': colorExpr(hi),
        'circle-opacity': 0.7,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
      },
    });
  }

  if (zones.length === 1) {
    map.easeTo({ center: [zones[0].lng, zones[0].lat], zoom: 12, duration: 0 });
  } else if (zones.length > 1) {
    const b = new maplibregl.LngLatBounds();
    zones.forEach((z) => b.extend([z.lng, z.lat]));
    map.fitBounds(b, { padding: 36, maxZoom: 12, duration: 0 });
  }
}

export default function DemandMap({ zones }: { zones: PickupZone[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  // latest zones, read by the single 'load' handler and by the update effect
  const zonesRef = useRef<PickupZone[]>(zones);
  zonesRef.current = zones;

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
    // ONE load handler; it reads the ref so it always renders the latest zones
    map.on('load', () => renderZones(map, zonesRef.current));
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // update when zones change (only once the style is ready; otherwise the load
  // handler above will render the latest zones)
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) renderZones(map, zones);
  }, [zones]);

  return <div ref={containerRef} className="h-full w-full" />;
}
