'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Search, PlusCircle, UserCircle } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import DynamicBackground from '@/components/DynamicBackground';
import { supabase } from '@/lib/supabase';
import styles from './home.module.css';

export default function HomePage() {
  const [name, setName] = useState('GUEST USER');
  const [location, setLocation] = useState('Fetching location...');

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (data?.full_name) setName(data.full_name.toUpperCase());
      }
    }
    getUser();

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
            const data = await res.json();
            const area = data.address?.suburb || data.address?.city_district || data.address?.city || data.address?.town || data.address?.county || "Unknown Area";
            setLocation(`${area}, ${data.address?.state || 'Local'}`);
          } catch (e) {
            setLocation(`Lat: ${pos.coords.latitude.toFixed(2)}, Lng: ${pos.coords.longitude.toFixed(2)}`);
          }
        },
        (err) => {
          setLocation('Location access denied');
        }
      );
    } else {
      setLocation('Location unavailable');
    }
  }, []);

  return (
    <div className={styles.container}>
      <DynamicBackground />
      <header className={styles.header}>
        <div className={styles.greeting}>
          <p className={styles.helloText}>HELLO,</p>
          <h2 className={styles.userName}>{name}</h2>
        </div>
        <Link href="/profile" className={styles.profileIconBtn}>
          <UserCircle size={36} color="var(--text-primary)" />
        </Link>
      </header>

      <div className={styles.locationBanner}>
        <MapPin size={18} color="var(--accent-primary)" />
        <span>{location}</span>
      </div>

      <main className={styles.mainContent}>
        
        <Link href="/post" className={`glass-card ${styles.actionCard} ${styles.lostCard}`}>
          <div className={styles.cardIconBox} style={{ background: 'var(--status-lost-bg)' }}>
            <PlusCircle size={32} color="var(--status-lost-text)" />
          </div>
          <div className={styles.cardText}>
            <h3>LOST SOMETHING?</h3>
            <p>Post details to find your item</p>
          </div>
        </Link>

        <Link href="/post?type=found" className={`glass-card ${styles.actionCard} ${styles.foundCard}`}>
          <div className={styles.cardIconBox} style={{ background: 'var(--status-found-bg)' }}>
            <Search size={32} color="var(--status-found-text)" />
          </div>
          <div className={styles.cardText}>
            <h3>FOUND SOMETHING?</h3>
            <p>Help return an item to its owner</p>
          </div>
        </Link>
      </main>

      <BottomNav />
    </div>
  );
}
