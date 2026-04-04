'use client';
import { useState, useEffect } from 'react';
import { ShieldAlert, Users, Package, MessageSquare, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from '../login/login.module.css';

export default function AdminPage() {
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'items' | 'chats'>('users');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAdminData = async (code: string) => {
    setLoading(true);
    setErrorMsg('');
    const { data: adminData, error } = await supabase.rpc('admin_get_all_data', { admin_passcode: code });
    if (error) {
      setErrorMsg(error.message);
      setIsAuthenticated(false);
    } else {
      setData(adminData);
      setIsAuthenticated(true);
    }
    setLoading(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAdminData(passcode);
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={`glass-card ${styles.card}`}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <ShieldAlert size={48} color="var(--status-lost-text)" />
            <h2 style={{ marginTop: '1rem' }}>Restricted Access</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>God Mode Admin Terminal</p>
          </div>
          
          {errorMsg && <div style={{ color: 'var(--status-lost-text)', fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>RPC Error: {errorMsg}. (Did you run the SQL script matching this passcode?)</div>}
          
          <form onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
              <input type="password" value={passcode} onChange={e => setPasscode(e.target.value)} placeholder="Enter Admin Passcode" required className={styles.input} />
            </div>
            <button type="submit" className={`btn-3d btn-primary ${styles.btn}`} disabled={loading}>
              {loading ? 'Verifying...' : 'Access Terminal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-lost-text)' }}>
          <ShieldAlert /> System Admin
        </h1>
        <button onClick={() => fetchAdminData(passcode)} className="btn-3d" style={{ padding: '8px', background: 'var(--glass-bg)', border: 'none', color: 'white' }}>
          <RefreshCw size={18} />
        </button>
      </header>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
        <button className="btn-3d" onClick={() => setActiveTab('users')} style={{ flex: 1, background: activeTab === 'users' ? 'var(--accent-primary)' : 'var(--glass-bg)', border: 'none', color: 'white', padding: '12px' }}>
          <Users size={20} style={{ display: 'block', margin: '0 auto 8px auto' }} /> Users ({data?.users?.length || 0})
        </button>
        <button className="btn-3d" onClick={() => setActiveTab('items')} style={{ flex: 1, background: activeTab === 'items' ? 'var(--accent-primary)' : 'var(--glass-bg)', border: 'none', color: 'white', padding: '12px' }}>
          <Package size={20} style={{ display: 'block', margin: '0 auto 8px auto' }} /> Posts ({data?.items?.length || 0})
        </button>
        <button className="btn-3d" onClick={() => setActiveTab('chats')} style={{ flex: 1, background: activeTab === 'chats' ? 'var(--accent-primary)' : 'var(--glass-bg)', border: 'none', color: 'white', padding: '12px' }}>
          <MessageSquare size={20} style={{ display: 'block', margin: '0 auto 8px auto' }} /> Chats ({data?.chats?.length || 0})
        </button>
      </div>

      <div className="glass-card" style={{ padding: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
        {activeTab === 'users' && (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--accent-primary)'}}><th>ID</th><th>Name</th><th>Phone/WA</th><th>Role</th></tr></thead>
            <tbody>
              {data?.users?.map((u: any) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{u.id.substring(0,8)}</td>
                  <td style={{ padding: '8px' }}>{u.full_name}</td>
                  <td style={{ padding: '8px', fontSize: '0.8rem' }}>{u.phone_number}</td>
                  <td style={{ padding: '8px' }}>{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'items' && (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--accent-primary)'}}><th>Type</th><th>Originator</th><th>Product</th><th>Status</th></tr></thead>
            <tbody>
              {data?.items?.map((i: any) => (
                <tr key={i.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '8px', color: i.type==='lost'?'var(--status-lost-text)':'var(--status-found-text)', fontWeight: 'bold' }}>{i.type.toUpperCase()}</td>
                  <td style={{ padding: '8px', fontSize: '0.7rem' }}>{i.user_id.substring(0,8)}</td>
                  <td style={{ padding: '8px' }}>{i.product_name}</td>
                  <td style={{ padding: '8px' }}>{i.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'chats' && (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--accent-primary)'}}><th>Date</th><th>Route</th><th>Message Sent</th></tr></thead>
            <tbody>
              {data?.chats?.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {new Date(c.created_at).toLocaleDateString()} {new Date(c.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </td>
                  <td style={{ padding: '8px', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
                    {c.sender_name} &rarr;<br/> {c.receiver_name}
                  </td>
                  <td style={{ padding: '8px', fontSize: '0.85rem' }}>{c.content}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
