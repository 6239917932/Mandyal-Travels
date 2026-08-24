import { Card } from '@/components/ui/Card';

import styles from './page.module.css';

export default function CustomerSupportCaseDetailLoading() {
  return (
    <section aria-busy="true" aria-live="polite" className={`account-page ${styles.page}`}>
      <div className={styles.heading}>
        <div>
          <p className="hotel-page__eyebrow">Support case</p>
          <h1>Loading case details…</h1>
          <p>Your support information is being prepared.</p>
        </div>
      </div>
      <div className={styles.layout}>
        <div className={styles.details}>
          <Card className={styles.placeholder}>Loading request…</Card>
          <Card className={styles.placeholder}>Loading case information…</Card>
        </div>
        <Card className={styles.placeholder}>Loading case timeline…</Card>
      </div>
    </section>
  );
}
