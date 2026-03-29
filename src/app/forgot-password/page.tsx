'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import styles from '../login/login.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage("Password reset email sent! Please check your inbox.");
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className="glass-card" style={{ padding: '2rem', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
        <h2 className={styles.title}>Reset Password</h2>
        {error && <p className={styles.error}>{error}</p>}
        {message && <p style={{ color: 'var(--success-color, #4ade80)', marginBottom: '1rem', textAlign: 'center' }}>{message}</p>}
        
        <form onSubmit={handleReset} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className={styles.input} 
              placeholder="name@example.com" 
            />
          </div>
          <button type="submit" disabled={loading} className="btn-3d btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className={styles.footerText}>
          Remember your password? <Link href="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
