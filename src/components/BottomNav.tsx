'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Layers, Map, MessageCircle } from 'lucide-react';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.bottomNav}>
      <Link href="/home" className={pathname === '/home' ? styles.navItemActive : styles.navItem}>
        <Home size={24} />
        <span>Home</span>
      </Link>
      <Link href="/feed" className={pathname === '/feed' ? styles.navItemActive : styles.navItem}>
        <Layers size={24} />
        <span>Feed</span>
      </Link>
      <Link href="/map" className={pathname === '/map' ? styles.navItemActive : styles.navItem}>
        <Map size={24} />
        <span>Map</span>
      </Link>
      <Link href="/chat" className={pathname === '/chat' ? styles.navItemActive : styles.navItem}>
        <MessageCircle size={24} />
        <span>Chat</span>
      </Link>
    </nav>
  );
}
