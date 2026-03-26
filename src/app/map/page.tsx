'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Navigation } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';
import styles from './map.module.css';

// Leaflet requires window, so dynamically import without SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then(mod => mod.CircleMarker),
  { ssr: false }
);

const getOffsetCoordinate = (seedStr: string) => {
  if (!seedStr) return [28.6139, 77.2090] as [number, number];
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = (hash % 100) / 10000;
  const lngOffset = ((hash >> 8) % 100) / 10000;
  return [28.6139 + latOffset, 77.2090 + lngOffset] as [number, number];
};

export default function MapPage() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [center, setCenter] = useState<[number, number]>([28.6139, 77.2090]); // Default Delhi
  const [hasRealLocation, setHasRealLocation] = useState(false);

  const locateUser = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
        setHasRealLocation(true);
      });
    }
  };
  
  useEffect(() => {
    // Inject leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    setMounted(true);

    async function fetchItems() {
      const { data } = await supabase.from('items').select('*').eq('status', 'active');
      if (data) setItems(data);
    }
    fetchItems();
    locateUser(); // Fetch location on mount
    
    return () => { document.head.removeChild(link); }
  }, []);

  if (!mounted) return <div className={styles.loading}>Loading Map...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Local Match Radar</h2>
        <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--status-lost-text)', fontWeight: 'bold' }}>● LOST</span>
          <span style={{ color: 'var(--status-found-text)', fontWeight: 'bold' }}>● FOUND</span>
        </div>
      </header>

      <div className={styles.mapWrapper}>
        <MapContainer key={`${center[0]}-${center[1]}`} center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {hasRealLocation && (
            <CircleMarker center={center} radius={8} pathOptions={{ color: 'var(--accent-primary)', fillColor: 'var(--accent-primary)', fillOpacity: 0.8 }}>
              <Popup><b>You are here</b></Popup>
            </CircleMarker>
          )}
          {items.map(item => (
            <Marker key={item.id} position={getOffsetCoordinate(item.location_area || item.id)}>
              <Popup>
                <b>{item.product_name}</b><br />
                Status: <span style={{color: item.type === 'lost' ? 'var(--status-lost-text)' : 'var(--status-found-text)'}}>{item.type.toUpperCase()}</span><br />
                Location: {item.location_area || 'Unknown'}<br />
                <button className="btn-3d btn-primary" style={{ padding: '4px 8px', marginTop: '8px', fontSize: '0.8rem' }}>View Details</button>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Floating locate button */}
        <button className={`btn-3d ${styles.locateBtn}`} onClick={locateUser}>
          <Navigation size={24} color="var(--accent-primary)" />
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
