'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, FeatureGroup } from 'leaflet';
import type { OfficialScaRecord } from '@/lib/official-sca-data';
import { tr } from '@/lib/ui-copy';

interface AgencyLocationsMapProps {
  language: string;
  agencies: OfficialScaRecord[];
  isActive: boolean;
}

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>';

function directionsUrl(agency: OfficialScaRecord, locationAddress?: string) {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set(
    'destination',
    `${agency.name}, ${locationAddress ?? agency.address}, ${agency.state}, India`,
  );
  return url.toString();
}

export default function AgencyLocationsMap({ agencies, isActive, language }: AgencyLocationsMapProps) {
  const t = (text: string) => tr(language, text);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<FeatureGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    let disposed = false;
    let map: LeafletMap | null = null;
    let resizeObserver: ResizeObserver | null = null;

    void import('leaflet').then(({ default: L }) => {
      if (disposed || !containerRef.current) return;

      map = L.map(containerRef.current, {
        center: [22.5, 82.5],
        zoom: 5,
        scrollWheelZoom: false,
        attributionControl: false,
        zoomControl: false,
      });
      L.control.zoom({ zoomInTitle: tr(language, 'Zoom in'), zoomOutTitle: tr(language, 'Zoom out') }).addTo(map);
      L.control.attribution({ prefix: false }).addTo(map);
      L.tileLayer(OSM_TILE_URL, {
        maxZoom: 19,
        attribution: OSM_ATTRIBUTION,
      }).addTo(map);

      const markers = L.featureGroup().addTo(map);
      mapRef.current = map;
      markersRef.current = markers;
      setMapReady(true);

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => map?.invalidateSize({ pan: false }));
        resizeObserver.observe(containerRef.current);
      }
      requestAnimationFrame(() => map?.invalidateSize({ pan: false }));
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      map?.remove();
      if (mapRef.current === map) mapRef.current = null;
      markersRef.current = null;
      setMapReady(false);
    };
  }, [isActive, language]);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!isActive || !mapReady || !map || !markers) return;

    let disposed = false;
    let frameId = 0;
    void import('leaflet').then(({ default: L }) => {
      if (disposed || mapRef.current !== map || markersRef.current !== markers) return;
      frameId = requestAnimationFrame(() => {
        if (disposed || mapRef.current !== map || markersRef.current !== markers) return;
        map.invalidateSize({ pan: false });
        markers.clearLayers();

        const positions: [number, number][] = [];
        for (const agency of agencies) {
          for (const location of agency.mapLocations) {
            const [latitude, longitude] = location.coordinates;
            positions.push([latitude, longitude]);

            const title = tr(language, `Open directions to ${agency.name} — ${location.label}`);
            const marker = L.marker([latitude, longitude], {
              title,
              alt: title,
              keyboard: true,
              icon: L.divIcon({
                className: 'agency-map-marker-shell',
                html: '<span class="agency-map-marker" aria-hidden="true"></span>',
                iconSize: [28, 36],
                iconAnchor: [14, 34],
              }),
            });

            const tooltip = document.createElement('span');
            tooltip.textContent = `${agency.name} · ${location.label}`;
            marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -24] });
            marker.on('click', () => {
              window.open(directionsUrl(agency, location.directionsAddress), '_blank', 'noopener,noreferrer');
            });
            marker.addTo(markers);
          }
        }

        if (positions.length === 1) {
          map.setView(positions[0], 13);
        } else if (positions.length > 1) {
          map.fitBounds(L.latLngBounds(positions), { padding: [28, 28], maxZoom: 13 });
        }
      });
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
    };
  }, [agencies, isActive, language, mapReady]);

  return (
      <section aria-label={t('Agency map')} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{t('Agency map')}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{t('Click a marker to open Google Maps directions in a new tab.')}</p>
        </div>
        <span className="text-[11px] text-slate-500">{t('Pins show approximate locality positions')}</span>
      </div>
      <div className="relative">
        <div ref={containerRef} className="h-[360px] w-full bg-slate-100 sm:h-[440px]" />
        {!mapReady && (
          <div role="status" className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm text-slate-500">
            {t('Loading map…')}
          </div>
        )}
      </div>
      <p className="border-t border-slate-100 px-4 py-2.5 text-[11px] leading-relaxed text-slate-500">
        {t('Map pins are approximate and based on the locality in the published directory. Google Maps directions use the full listed office address. Map data and tiles © OpenStreetMap contributors.')}{' '}
        <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer" className="font-semibold text-sky-700 hover:underline">{t('Report a map issue')}</a>
      </p>
    </section>
  );
}
