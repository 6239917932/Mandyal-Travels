'use client';

import { useState, type ReactNode } from 'react';

type BookingProduct = 'hotels' | 'cars' | 'flights' | 'buses';

const PRODUCTS: ReadonlyArray<{
  available: boolean;
  href: string;
  label: string;
  value: BookingProduct;
}> = [
  { available: true, href: '/hotels', label: 'Hotels', value: 'hotels' },
  { available: true, href: '/cars', label: 'Cars', value: 'cars' },
  { available: false, href: '/flights', label: 'Flights', value: 'flights' },
  { available: false, href: '/buses', label: 'Buses', value: 'buses' },
];

function ProductIcon({ product }: { product: BookingProduct }) {
  const paths: Record<BookingProduct, ReactNode> = {
    hotels: <path d="M4 19V8l8-4 8 4v11M8 19v-5h8v5M8 9h.01M12 9h.01M16 9h.01" />,
    flights: <path d="m3 11 7 1 4-8 2 1-2 8 5 2v2l-6-1-3 4-2-1 2-4-7-2Z" />,
    buses: <path d="M5 17V7c0-2 1.5-3 7-3s7 1 7 3v10M5 11h14M8 17v2M16 17v2M8 15h.01M16 15h.01" />,
    cars: <path d="m4 15 1.5-5h13l1.5 5M6 10l2-4h8l2 4M5 15v3M19 15v3M8 15h.01M16 15h.01" />,
  };

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
        {paths[product]}
      </g>
    </svg>
  );
}

function Field({
  label,
  name,
  placeholder,
  required = true,
  type = 'text',
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="home-booking-widget__field">
      <span>{label}</span>
      <input name={name} placeholder={placeholder} required={required} type={type} />
    </label>
  );
}

export function HomeBookingWidget() {
  const [activeProduct, setActiveProduct] = useState<BookingProduct>('hotels');
  const active = PRODUCTS.find((product) => product.value === activeProduct) ?? PRODUCTS[0];

  return (
    <div className="home-booking-widget">
      <div aria-label="Choose a booking type" className="home-booking-widget__tabs" role="tablist">
        {PRODUCTS.map((product) => (
          <button
            aria-controls="home-booking-panel"
            aria-selected={activeProduct === product.value}
            className={activeProduct === product.value ? 'is-active' : undefined}
            id={`home-product-${product.value}`}
            key={product.value}
            onClick={() => setActiveProduct(product.value)}
            role="tab"
            type="button"
          >
            <ProductIcon product={product.value} />
            <span>{product.label}</span>
            {!product.available ? <small>Coming soon</small> : null}
          </button>
        ))}
      </div>

      {active.available ? (
        <form
          action={active.href}
          aria-labelledby={`home-product-${activeProduct}`}
          className="home-booking-widget__form"
          id="home-booking-panel"
          key={activeProduct}
          role="tabpanel"
        >
          {activeProduct === 'hotels' ? (
            <>
              <Field
                label="Where are you going?"
                name="destination"
                placeholder="City, area, or hotel"
              />
              <Field label="Check-in" name="checkInDate" type="date" />
              <Field label="Check-out" name="checkOutDate" type="date" />
              <label className="home-booking-widget__field">
                <span>Guests</span>
                <select defaultValue="2" name="adults">
                  <option value="1">1 guest</option>
                  <option value="2">2 guests</option>
                  <option value="3">3 guests</option>
                  <option value="4">4 guests</option>
                </select>
              </label>
              <input name="children" type="hidden" value="0" />
              <input name="rooms" type="hidden" value="1" />
            </>
          ) : null}

          {activeProduct === 'cars' ? (
            <>
              <Field label="Pickup" name="pickupLocation" placeholder="Mandi" />
              <Field label="Drop-off" name="dropoffLocation" placeholder="Manali" />
              <Field label="Pickup date" name="pickupDate" type="date" />
              <Field label="Drop-off date" name="dropoffDate" type="date" />
              <input name="pickupTime" type="hidden" value="10:00" />
              <input name="dropoffTime" type="hidden" value="10:00" />
              <input name="drivers" type="hidden" value="1" />
              <input name="rentalMode" type="hidden" value="self-drive" />
            </>
          ) : null}

          <button className="home-booking-widget__submit" type="submit">
            Search {active.label.toLowerCase()}
            <span aria-hidden="true">→</span>
          </button>
        </form>
      ) : (
        <div
          aria-labelledby={`home-product-${activeProduct}`}
          className="home-booking-widget__coming-soon"
          id="home-booking-panel"
          key={activeProduct}
          role="tabpanel"
        >
          <div>
            <strong>{active.label} are coming soon</strong>
            <p>
              We will activate live search only after a verified supplier API is connected and
              tested. No demonstration fare will be presented as live inventory.
            </p>
          </div>
          <a href="/contact">Ask to be notified</a>
        </div>
      )}

      <div className="home-booking-widget__benefits" aria-label="Booking benefits">
        <span>Clear prices</span>
        <span>Owner-managed inventory</span>
        <span>Human support</span>
      </div>
    </div>
  );
}
