'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/update-password'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const isPublic = PUBLIC_ROUTES.includes(pathname || '');

      if (!session && !isPublic) {
        router.replace('/login');
      } else if (session && (pathname === '/' || pathname === '/login' || pathname === '/register')) {
        // If they are on the welcome or login screen but already have an active session, push them in!
        router.replace('/home');
      } else {
        setLoading(false);
      }
    };
    
    checkAuth();

    // Listen for auth changes to dynamically reroute if they logout in another tab
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
       const isPublic = PUBLIC_ROUTES.includes(pathname || '');
       if (event === 'SIGNED_OUT' && !isPublic) {
         router.replace('/login');
       } else if (event === 'SIGNED_IN' && isPublic) {
         router.replace('/home');
       }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--accent-primary)' }}>
         <div style={{ padding: '1.5rem', borderRadius: '1rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            Authenticating...
         </div>
      </div>
    );
  }

  return <>{children}</>;
}
