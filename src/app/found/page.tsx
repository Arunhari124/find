'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';
import styles from './found.module.css';

export default function FoundGalleryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFoundItems() {
      const { data } = await supabase
        .from('items')
        .select('*')
        .eq('type', 'found')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (data) setItems(data);
      setLoading(false);
    }
    fetchFoundItems();
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Found Items Gallery</h2>
        <p style={{margin:0, marginTop:'4px', fontSize:'0.85rem', color:'var(--text-secondary)'}}>Showcasing all items recently found by the community</p>
      </header>

      {loading ? (
        <div style={{textAlign:'center', marginTop:'3rem', color:'var(--text-secondary)'}}>Loading gallery...</div>
      ) : items.length === 0 ? (
        <div style={{textAlign:'center', marginTop:'3rem', color:'var(--text-secondary)'}}>No found items currently active.</div>
      ) : (
        <div className={styles.grid}>
          {items.map(item => (
            <Link key={item.id} href={`/item/${item.id}`} className={`glass-card ${styles.card}`}>
              <div className={styles.imageBox}>
                <span className={styles.badge}>FOUND</span>
                <img src={item.image_url || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400'} alt={item.product_name} />
              </div>
              <div className={styles.info}>
                <h3>{item.product_name}</h3>
                <span className={styles.location}>{item.location_area || 'Nearby'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
