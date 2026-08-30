export function PaymentMarks() {
  return (
    <div
      className="site-footer__payment-marks"
      aria-label="Payment methods supported by connected providers"
    >
      <span className="payment-mark payment-mark--visa" aria-label="Visa">
        VISA
      </span>
      <span className="payment-mark payment-mark--mastercard" aria-label="Mastercard">
        <i aria-hidden="true" />
        <b>mastercard</b>
      </span>
      <span className="payment-mark payment-mark--amex" aria-label="American Express">
        AMERICAN
        <br />
        EXPRESS
      </span>
      <span className="payment-mark payment-mark--rupay" aria-label="RuPay">
        RuPay
      </span>
      <span className="payment-mark payment-mark--upi" aria-label="UPI">
        UPI
      </span>
      <span className="payment-mark payment-mark--paypal" aria-label="PayPal">
        PayPal
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
