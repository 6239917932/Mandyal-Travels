import styles from './page.module.css';

export default function CustomerTransportTripDetailLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading transport booking details"
      className={styles.page}
    >
      <div className={styles.loading} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className={styles.loading} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
