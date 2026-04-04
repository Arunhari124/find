'use client';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Navigation, MapPin } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';
import styles from './map.module.css';

// Leaflet requires window, so dynamically import without SSR
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });

// Fallback coordinate generator for old items without GPS
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

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function MapPage() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [center, setCenter] = useState<[number, number]>([28.6139, 77.2090]); // Default Delhi
  const [hasRealLocation, setHasRealLocation] = useState(false);
  const [showNearbyList, setShowNearbyList] = useState(false);
  
  // Police Station State
  const [policeStation, setPoliceStation] = useState<{lat: number, lon: number, name: string} | null>(null);

  const locateUser = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const uLat = pos.coords.latitude;
          const uLng = pos.coords.longitude;
          setCenter([uLat, uLng]);
          setHasRealLocation(true);
          
          // Nearest Police Station Overpass/Nominatim query
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=police+station&limit=1&lat=${uLat}&lon=${uLng}`);
            const data = await res.json();
            if (data && data.length > 0) {
               setPoliceStation({
                  lat: parseFloat(data[0].lat),
                  lon: parseFloat(data[0].lon),
                  name: data[0].name || "Nearest Police Station"
               });
            }
          } catch (e) {
            console.error("Could not fetch police station", e);
          }
        },
        (err) => console.error(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
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

  // Calculate distances and sort
  const sortedItems = useMemo(() => {
    if (!hasRealLocation) return items;
    return [...items].map(item => {
      const coords = (item.lat && item.lng) ? [item.lat, item.lng] : getOffsetCoordinate(item.location_area || item.id);
      const dist = getDistance(center[0], center[1], coords[0], coords[1]);
      return { ...item, computedCoords: coords, distanceToUser: dist };
    }).sort((a, b) => a.distanceToUser - b.distanceToUser);
  }, [items, center, hasRealLocation]);

  const nearbyItems = sortedItems.filter(i => i.distanceToUser !== undefined && i.distanceToUser < 10); // within 10km

  if (!mounted) return <div className={styles.loading}>Loading Map...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Local Match Radar</h2>
        <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--status-lost-text)', fontWeight: 'bold' }}>● LOST</span>
          <span style={{ color: 'var(--status-found-text)', fontWeight: 'bold' }}>● FOUND</span>
          <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>● POLICE</span>
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
          
          {policeStation && (
            <CircleMarker center={[policeStation.lat, policeStation.lon]} radius={10} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.9 }}>
               <Popup><b>{policeStation.name}</b><br/>Nearest Authority plotted for safety.</Popup>
            </CircleMarker>
          )}

          {sortedItems.map(item => {
            const coords = item.computedCoords || (item.lat && item.lng ? [item.lat, item.lng] : getOffsetCoordinate(item.location_area || item.id));
            const isNearby = item.distanceToUser && item.distanceToUser < 5; // Highlight if < 5km

            return (
              <Marker key={item.id} position={coords as [number, number]}>
                <Popup>
                  <b>{item.product_name}</b> {isNearby && '📍 Nearby!'}<br />
                  Status: <span style={{color: item.type === 'lost' ? 'var(--status-lost-text)' : 'var(--status-found-text)'}}>{item.type.toUpperCase()}</span><br />
                  Location: {item.location_area || 'Unknown'}<br />
                  {item.distanceToUser && <small>{item.distanceToUser.toFixed(1)} km away</small>}<br/>
                  <Link href={`/item/${item.id}`} className="btn-3d btn-primary" style={{ padding: '4px 8px', marginTop: '8px', fontSize: '0.8rem', display: 'inline-block', textDecoration: 'none' }}>
                    View Details
                  </Link>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        
        {/* Floating locate button */}
        <button className={`btn-3d ${styles.locateBtn}`} onClick={locateUser} style={{ width: 'auto', padding: '10px 20px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Navigation size={20} color="var(--accent-primary)" /> 
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>My Location</span>
        </button>

        {/* Nearby Panel Toggle */}
        <div style={{ position: 'absolute', bottom: '90px', left: '20px', right: '20px', zIndex: 1000}}>
           <button 
             onClick={() => setShowNearbyList(!showNearbyList)}
             className="glass-card" 
             style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', background: 'rgba(20,20,30,0.85)', color: 'white' }}>
             <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={18} color="var(--accent-primary)"/> {showNearbyList ? 'Hide' : 'Show'} Nearby Items ({nearbyItems.length})</span>
           </button>
           
           {showNearbyList && (
             <div className="glass-card" style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(20,20,30,0.95)', marginTop: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               {nearbyItems.length === 0 ? <p style={{ fontSize: '0.8rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No items found within 10km.</p> : null}
               {nearbyItems.map(item => (
                 <Link key={item.id} href={`/item/${item.id}`} style={{ textDecoration: 'none' }}>
                   <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                     <div>
                       <h5 style={{ margin: 0, color: 'var(--text-primary)' }}>{item.product_name}</h5>
                       <span style={{ fontSize: '0.75rem', color: item.type === 'lost' ? 'var(--status-lost-text)' : 'var(--status-found-text)' }}>{item.type.toUpperCase()}</span>
                     </div>
                     <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.distanceToUser?.toFixed(1)} km</span>
                   </div>
                 </Link>
               ))}
             </div>
           )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
