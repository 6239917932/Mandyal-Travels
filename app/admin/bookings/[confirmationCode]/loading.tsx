import styles from './page.module.css';

export default function AdminBookingDossierLoading() {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className={`account-page admin-workspace ${styles.page}`}
    >
      <header className={`admin-hero ${styles.hero}`}>
        <div>
          <p className="admin-hero__eyebrow">Read-only operational evidence</p>
          <h1>Loading booking dossier…</h1>
          <p>The protected booking summary is being prepared.</p>
        </div>
      </header>
      <div className={styles.loadingGrid} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
