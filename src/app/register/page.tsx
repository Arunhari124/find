'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../login/login.module.css';

export default function RegisterPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isWaitingForOtp, setIsWaitingForOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Using WhatsApp OTP (Requires Twilio/MessageBird configured in Supabase)
    const { error: signUpError, data } = await supabase.auth.signInWithOtp({
      phone: phone.startsWith('+') ? phone : `+91${phone}`, // Auto-prefix India if raw
      options: {
        channel: 'whatsapp',
        data: {
          full_name: name,
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      setIsWaitingForOtp(true);
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: phone.startsWith('+') ? phone : `+91${phone}`,
      token: otp,
      type: 'sms' // Supabase uses 'sms' type for verification even if WhatsApp channel was strictly used to send it
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
    } else {
      router.push('/home');
    }
  };

  return (
    <div className={styles.container}>
      <div className="glass-card" style={{ padding: '2rem', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
        <h2 className={styles.title}>Create Account</h2>
        {error && <p className={styles.error}>{error}</p>}
        {isWaitingForOtp ? (
          <form onSubmit={handleVerifyOtp} className={styles.form}>
            <p style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              We sent a validation code to your WhatsApp: <strong>{phone}</strong>. Entering it verifies your number.
            </p>
            <div className={styles.inputGroup}>
              <label>WhatsApp Verification Code</label>
              <input 
                type="text" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                required 
                className={styles.input} 
                maxLength={6} 
                placeholder="123456" 
                style={{ textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.5rem' }}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-3d btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              {loading ? 'Verifying...' : 'Confirm WhatsApp'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={styles.input} />
            </div>
            <div className={styles.inputGroup}>
              <label>Mobile / WhatsApp Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className={styles.input} placeholder="+91 9999999999" />
            </div>
            <div className={styles.inputGroup}>
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={styles.input} />
            </div>
            <button type="submit" disabled={loading} className="btn-3d btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              {loading ? 'Sending WhatsApp...' : 'Register'}
            </button>
          </form>
        )}
        <p className={styles.footerText}>
          Already have an account? <Link href="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
