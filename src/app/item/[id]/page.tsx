'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, MessageCircle, Info, Calendar } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import styles from './item.module.css';

export default function ItemDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchItem() {
      if (!params?.id) return;
      const { data } = await supabase
        .from('items')
        .select(`*, profiles ( id, full_name, phone_number, whatsapp_number )`)
        .eq('id', params.id)
        .single();
      
      if (data) setItem(data);
      setLoading(false);
    }
    fetchItem();
  }, [params?.id]);

  if (loading) return <div className={styles.container} style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}>Loading details...</div>;
  if (!item) return <div className={styles.container} style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}>Item not found.</div>;

  const isLost = item.type === 'lost';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn} style={{background:'none',border:'none',cursor:'pointer'}}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{margin:0, fontSize:'1.2rem'}}>Item Details</h2>
      </header>

      <div className={styles.imageContainer}>
        <img src={item.image_url || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800'} alt={item.product_name} />
      </div>

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <div>
            <h1>{item.product_name}</h1>
            <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
              <span className={`${styles.badge} ${isLost ? styles.badgeLost : ''}`}>
                {item.type}
              </span>
              <span style={{color:'var(--text-secondary)', fontSize:'0.9rem'}}>{item.category}</span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3><Info size={18}/> Description & Details</h3>
          <p className={styles.description}>{item.description || 'No additional description provided.'}</p>
        </div>

        <div className={styles.section}>
          <h3><MapPin size={18}/> Location Details</h3>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Area:</span>
            <span className={styles.detailValue}>{item.location_area || 'Not specified'}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Posted:</span>
            <span className={styles.detailValue}>{new Date(item.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className={styles.section}>
          <h3>Contact Information</h3>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Posted by:</span>
            <span className={styles.detailValue}>{item.profiles?.full_name || 'Anonymous User'}</span>
          </div>
          
          <div className={styles.actions} style={{marginTop: '1.5rem'}}>
            <div className={styles.actionsRow}>
              <a href={`tel:${item.profiles?.phone_number}`} className="btn-3d" style={{flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', textDecoration: 'none'}}>
                <Phone size={18} /> Call
              </a>
              <a href={`https://wa.me/${item.profiles?.whatsapp_number}?text=${encodeURIComponent(`Hi ${item.profiles?.full_name}, I am contacting you regarding your ${item.type} ${item.product_name} on FIND.`)}`} target="_blank" rel="noopener noreferrer" className="btn-3d btn-primary" style={{flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', textDecoration: 'none'}}>
                <MessageCircle size={18} /> WhatsApp
              </a>
            </div>
            <Link href={`/chat?peer=${item.profiles?.id}`} className="btn-3d btn-primary" style={{width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', textDecoration: 'none', background: 'var(--accent-primary)', color:'white'}}>
              <MessageCircle size={18} /> Start In-App Chat
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
