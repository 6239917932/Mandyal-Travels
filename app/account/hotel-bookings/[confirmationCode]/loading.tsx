import styles from './page.module.css';

export default function HotelBookingDetailLoading() {
  return (
    <section aria-busy="true" aria-label="Loading hotel booking details" className={styles.page}>
      <div className={styles.loading}>
        <span />
        <span />
        <span />
      </div>
      <div className={styles.loading}>
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
