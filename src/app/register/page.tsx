'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../login/login.module.css';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Standard Email Auth
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone_number: phone,
          whatsapp_number: phone
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      alert("Registration successful! If you have email confirmations enabled, please check your inbox to verify your account before logging in.");
      router.push('/login');
    }
  };

  return (
    <div className={styles.container}>
      <div className="glass-card" style={{ padding: '2rem', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
        <h2 className={styles.title}>Create Account</h2>
        {error && <p className={styles.error}>{error}</p>}
        
        <form onSubmit={handleRegister} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={styles.input} />
          </div>
          <div className={styles.inputGroup}>
            <label>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={styles.input} placeholder="name@example.com" />
          </div>
          <div className={styles.inputGroup}>
            <label>Mobile Number (For Contact)</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className={styles.input} placeholder="e.g. 9999999999" />
          </div>
          <div className={styles.inputGroup}>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={styles.input} />
          </div>
          <button type="submit" disabled={loading} className="btn-3d btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p className={styles.footerText}>
          Already have an account? <Link href="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
