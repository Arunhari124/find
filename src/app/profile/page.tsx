'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, LogOut, PackageSearch, PackageCheck } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import styles from './profile.module.css';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const getCategoryStyle = (category: string) => {
  const cat = category.toLowerCase();
  let gradient = 'var(--glass-bg)'; // default
  
  if (cat.includes('wallet') || cat.includes('card')) {
    gradient = 'linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, var(--glass-bg) 100%)';
  } else if (cat.includes('electronic') || cat.includes('phone')) {
    gradient = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, var(--glass-bg) 100%)';
  } else if (cat.includes('jewelry') || cat.includes('watch') || cat.includes('gold')) {
    gradient = 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, var(--glass-bg) 100%)';
  } else if (cat.includes('key')) {
    gradient = 'linear-gradient(135deg, rgba(107, 114, 128, 0.15) 0%, var(--glass-bg) 100%)';
  }
  
  return { background: gradient };
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [myItems, setMyItems] = useState<any[]>([]);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const [profileRes, itemsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('items').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);

      if (profileRes.data) {
        setFullName(profileRes.data.full_name || '');
        setPhone(profileRes.data.phone_number || '');
        setWhatsapp(profileRes.data.whatsapp_number || '');
        setAvatarUrl(profileRes.data.avatar_url || '');
      }
      
      if (itemsRes.data) {
        setMyItems(itemsRes.data);
      }
      
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone_number: phone,
        whatsapp_number: whatsapp,
        avatar_url: avatarUrl
      })
      .eq('id', user.id);
      
    setSaving(false);
    if (!error) setIsEditing(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleMarkFound = async (id: number) => {
    const { error } = await supabase.from('items').update({ status: 'resolved' }).eq('id', id);
    if (!error) {
      setMyItems(myItems.map(item => item.id === id ? { ...item, status: 'resolved' } : item));
      alert('Item marked as resolved!');
    } else {
      alert('Error updating item: ' + error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (!error) {
      setMyItems(myItems.filter(item => item.id !== id));
      alert('Item deleted successfully!');
    } else {
      alert('Error deleting item: ' + error.message);
    }
  };

  if (loading) {
    return <div className={styles.container} style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', color:'var(--text-primary)'}}>Loading Profile...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/home" className={styles.backBtn}>&larr; Back</Link>
        <h2>Profile</h2>
        <button className={styles.iconBtn} onClick={() => setIsEditing(!isEditing)}>
          <Settings size={22} />
        </button>
      </header>

      <main className={styles.mainContent}>
        {isEditing ? (
          <div className="glass-card" style={{ padding: '24px', display:'flex', flexDirection:'column', gap:'16px' }}>
            <h3>Edit Profile</h3>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Full Name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', marginTop: '4px' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Phone Number</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', marginTop: '4px' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>WhatsApp Number</label>
              <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', marginTop: '4px' }} />
            </div>
            <button onClick={handleSave} disabled={saving} className="btn-3d btn-primary" style={{ padding: '12px', marginTop: '8px' }}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <button onClick={() => setIsEditing(false)} className="btn-3d" style={{ padding: '12px', background: 'transparent', border: '1px solid var(--text-secondary)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className={styles.profileHeader}>
              <div className={styles.avatarLarge}>
                 {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} /> : (fullName ? fullName[0].toUpperCase() : 'U')}
              </div>
              <h2 className={styles.name}>{fullName || user?.email}</h2>
              <p className={styles.phone}>{phone ? `Phone: ${phone}` : 'No phone provided'}</p>
              {whatsapp && <p className={styles.phone}>WhatsApp: {whatsapp}</p>}
              <button onClick={() => setIsEditing(true)} className={`btn-3d ${styles.editBtn}`}>Edit Profile</button>
            </div>

            <div className={styles.statsRow}>
              <div className={`glass-card ${styles.statCard}`}>
                <PackageSearch size={28} color="var(--status-lost-text)" />
                <h3>{myItems.filter((i: any) => i.type === 'lost').length}</h3>
                <p>Lost Items</p>
              </div>
              <div className={`glass-card ${styles.statCard}`}>
                <PackageCheck size={28} color="var(--status-found-text)" />
                <h3>{myItems.filter((i: any) => i.type === 'found').length}</h3>
                <p>Found Items</p>
              </div>
            </div>

            <div className={styles.sectionHeader}>
              <h3>My Posts</h3>
            </div>
            
            {myItems.length === 0 ? (
              <p style={{textAlign:'center', color:'var(--text-secondary)', fontSize:'0.9rem'}}>No items posted yet.</p>
            ) : (
              myItems.map(item => (
                <div key={item.id} className={`glass-card ${styles.postItem}`} style={getCategoryStyle(item.category)}>
                  <div className={styles.postMeta}>
                    <span className={styles.postType} style={{ color: item.type === 'lost' ? 'var(--status-lost-text)' : 'var(--status-found-text)' }}>
                      {item.type.toUpperCase()}
                    </span>
                    <span className={styles.postDate}>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <h4>{item.product_name}</h4>
                  <div className={styles.postActions}>
                    {item.status === 'active' && <button onClick={() => handleMarkFound(item.id)} className="btn-3d" style={{ padding: '6px 16px', fontSize: '0.85rem' }}>Mark Found</button>}
                    <button onClick={() => handleDelete(item.id)} className="btn-3d" style={{ padding: '6px 16px', fontSize: '0.85rem', color: 'red' }}>Delete</button>
                  </div>
                </div>
              ))
            )}

            <button onClick={handleLogout} className={`btn-3d ${styles.logoutBtn}`}>
              <LogOut size={20} /> Logout
            </button>
          </>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
}
