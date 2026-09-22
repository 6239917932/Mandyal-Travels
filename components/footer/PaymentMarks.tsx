export function PaymentMarks() {
  return (
    <div className="site-footer__payment-marks" aria-label="Provider-confirmed payment options">
      <span className="payment-status">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M7 10V8a5 5 0 0 1 10 0v2h1.25A1.75 1.75 0 0 1 20 11.75v7.5A1.75 1.75 0 0 1 18.25 21H5.75A1.75 1.75 0 0 1 4 19.25v-7.5A1.75 1.75 0 0 1 5.75 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Zm3 3a1.5 1.5 0 0 0-.75 2.8V18h1.5v-2.2A1.5 1.5 0 0 0 12 13Z" />
        </svg>
        <span>
          <strong>Secure checkout</strong>
          <small>Available payment options are confirmed before you pay</small>
        </span>
      </span>
    </div>
  );
}

export function SecureWebsiteMark() {
  return (
    <span className="site-footer__secure-mark">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 2 4.5 5v5.7c0 5 3.1 9.4 7.5 11.3 4.4-1.9 7.5-6.3 7.5-11.3V5L12 2Zm3.6 7.3-4.3 5.2a1 1 0 0 1-1.5.1l-2.2-2.1 1.4-1.4 1.4 1.3 3.7-4.4 1.5 1.3Z" />
      </svg>
      <span>
        <strong>Secure website</strong>
        <small>Encrypted connections and protected account access</small>
      </span>
    </span>
  );
}
