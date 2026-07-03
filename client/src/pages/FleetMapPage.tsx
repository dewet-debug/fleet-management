import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  HiOutlineMapPin,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowTopRightOnSquare,
} from 'react-icons/hi2';
import { Card, Input, StatusBadge, LoadingSpinner } from '../components/ui';
import { lastSynced, int } from '../theme/format';
import { statusMeta } from '../theme/status';
import { useFleetPositions } from '../hooks/useTracking';
import type { FleetPosition } from '../api/tracking';

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

const SOURCE_COLOR: Record<FleetPosition['source'], string> = {
  cartrack: '#17935b', // green — live GPS
  bolt: '#40427a', // indigo — last-known from a Bolt trip
};

const SOURCE_LABEL: Record<FleetPosition['source'], string> = {
  cartrack: 'Live · Cartrack',
  bolt: 'Last-known · Bolt',
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function popupHtml(p: FleetPosition): string {
  const meta = statusMeta('vehicle', p.status);
  const name = `${p.make} ${p.model}`.trim();
  return `
    <div style="font-family:inherit;min-width:170px;line-height:1.35">
      <div style="font-family:ui-monospace,monospace;font-weight:700;font-size:13px;color:#1a1a2e">${escapeHtml(p.licensePlate)}</div>
      <div style="font-size:12px;color:#4a4a5e;margin-top:2px">${escapeHtml(name)}</div>
      <div style="font-size:12px;color:#4a4a5e">${escapeHtml(p.driverName ?? 'Unassigned')}</div>
      <div style="font-size:11px;font-weight:600;margin-top:4px;color:#1a1a2e">${escapeHtml(meta.label)}</div>
      <div style="font-family:ui-monospace,monospace;font-size:11px;color:#8a8a9e;margin-top:2px">${escapeHtml(lastSynced(p.lastSeen))}</div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:${SOURCE_COLOR[p.source]};margin-top:3px;font-weight:600">${escapeHtml(SOURCE_LABEL[p.source])}</div>
    </div>`;
}

function markerElement(source: FleetPosition['source']): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'h-3 w-3 rounded-pill';
  el.style.background = SOURCE_COLOR[source];
  el.style.border = '2px solid #ffffff';
  el.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.15)';
  el.style.cursor = 'pointer';
  return el;
}

const JHB: [number, number] = [28.0473, -26.2041];

export default function FleetMapPage() {
  const navigate = useNavigate();
  const { data, isLoading, dataUpdatedAt } = useFleetPositions();
  const [search, setSearch] = useState('');

  const positions = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta ?? { total: 0, sources: {} as Record<string, number> };
  const liveCount = meta.sources.cartrack ?? 0;
  const boltCount = meta.sources.bolt ?? 0;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const positionsRef = useRef<FleetPosition[]>(positions);
  positionsRef.current = positions;
  // Only fit-to-bounds once, on the first batch of positions.
  const didFitRef = useRef(false);

  // init once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: JHB,
      zoom: 9,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;
    // ONE load handler; reads the ref so it renders the latest positions
    map.on('load', () => renderMarkers(map, positionsRef.current));
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update when positions change (once the style is ready; otherwise the load
  // handler above renders the latest positions)
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) renderMarkers(map, positions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions]);

  function renderMarkers(map: maplibregl.Map, list: FleetPosition[]) {
    // positions move on refresh — wipe and re-add fresh markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    list.forEach((p) => {
      const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(popupHtml(p));
      const marker = new maplibregl.Marker({ element: markerElement(p.source) })
        .setLngLat([p.lng, p.lat])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.set(p.vehicleId, marker);
    });

    if (!didFitRef.current && list.length > 0) {
      didFitRef.current = true;
      if (list.length === 1) {
        map.easeTo({ center: [list[0].lng, list[0].lat], zoom: 13, duration: 0 });
      } else {
        const b = new maplibregl.LngLatBounds();
        list.forEach((p) => b.extend([p.lng, p.lat]));
        map.fitBounds(b, { padding: 48, maxZoom: 13, duration: 0 });
      }
    }
  }

  function focusVehicle(p: FleetPosition) {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [p.lng, p.lat], zoom: 14 });
    const marker = markersRef.current.get(p.vehicleId);
    const popup = marker?.getPopup();
    if (marker && popup && !popup.isOpen()) marker.togglePopup();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return positions;
    return positions.filter(
      (p) =>
        p.licensePlate.toLowerCase().includes(q) ||
        (p.driverName ?? '').toLowerCase().includes(q)
    );
  }, [positions, search]);

  if (isLoading && !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-primary-500">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink">
          <HiOutlineMapPin className="text-primary-500" />
          Live Fleet Map
        </h1>
        <p className="mt-1 font-mono text-meta uppercase tracking-wider text-ink-ghost">
          {int(meta.total)} vehicles · {int(liveCount)} live · {int(boltCount)} Bolt trips
          {dataUpdatedAt ? ` · updated ${lastSynced(new Date(dataUpdatedAt))}` : ''}
        </p>
      </div>

      {!liveCount && (
        <div className="rounded-control bg-primary-50 px-3 py-2 text-xs text-primary-700">
          Showing last-known positions from Bolt trips — live GPS activates when the Cartrack
          tracker integration is connected.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        {/* left panel */}
        <Card bodyClassName="p-3">
          <div className="relative">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <Input
              placeholder="Search plate or driver…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="mt-3 max-h-[calc(100vh-300px)] min-h-[200px] space-y-0.5 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-ink-faint">No vehicles match.</p>
            ) : (
              filtered.map((p) => (
                <div
                  key={p.vehicleId}
                  className="group flex items-center gap-2.5 rounded-control px-2.5 py-2 transition-colors hover:bg-paper-sunken"
                >
                  <button
                    onClick={() => focusVehicle(p)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-pill"
                      style={{ background: SOURCE_COLOR[p.source] }}
                      title={SOURCE_LABEL[p.source]}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-sm font-semibold text-ink">
                        {p.licensePlate}
                      </span>
                      <span className="block truncate text-xs text-ink-faint">
                        {p.driverName ?? 'Unassigned'}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-meta text-ink-ghost">
                      {lastSynced(p.lastSeen)}
                    </span>
                  </button>
                  <button
                    onClick={() => navigate(`/vehicles/${p.vehicleId}`)}
                    title="View vehicle"
                    className="shrink-0 rounded-control p-1 text-ink-ghost opacity-0 transition-opacity hover:text-primary-700 group-hover:opacity-100"
                  >
                    <HiOutlineArrowTopRightOnSquare />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* map */}
        <div className="h-[calc(100vh-190px)] min-h-[420px] overflow-hidden rounded-card border border-paper-line">
          <div ref={containerRef} className="h-full w-full" />
        </div>
      </div>

      {/* source legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-pill" style={{ background: SOURCE_COLOR.cartrack }} />
          Live GPS (Cartrack)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-pill" style={{ background: SOURCE_COLOR.bolt }} />
          Last-known (Bolt trip)
        </span>
      </div>
    </div>
  );
}
