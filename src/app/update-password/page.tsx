'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../login/login.module.css';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user has an active session from the reset link
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Warning: Might not trigger if hash fragments are parsed slowly, but it's a fallback.
      }
    };
    checkSession();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      alert("Password updated successfully! You can now log in with your new password.");
      router.push('/login');
    }
  };

  return (
    <div className={styles.container}>
      <div className="glass-card" style={{ padding: '2rem', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
        <h2 className={styles.title}>Create New Password</h2>
        {error && <p className={styles.error}>{error}</p>}
        
        <form onSubmit={handleUpdate} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>New Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className={styles.input} 
            />
          </div>
          <button type="submit" disabled={loading} className="btn-3d btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <p className={styles.footerText}>
          <Link href="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
