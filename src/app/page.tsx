import Link from "next/link";
import styles from "./page.module.css";

export default function WelcomePage() {
  return (
    <div className={styles.container}>
      <div className={styles.logoContainer}>
        <h1 className={styles.logoText}>FIND</h1>
        <p className={styles.welcomeText}>Reconnect what's lost.</p>
      </div>
      
      <div className={styles.actionsContainer}>
        <Link href="/login" className="btn-3d btn-primary" style={{ width: '100%', textAlign: 'center', marginBottom: '16px', display: 'block' }}>
          Login
        </Link>
        <Link href="/register" className="btn-3d" style={{ width: '100%', textAlign: 'center', marginBottom: '16px', display: 'block' }}>
          Register
        </Link>
        <Link href="/home" className={styles.guestLink}>
          Continue as Guest
        </Link>
      </div>
    </div>
  );
}
