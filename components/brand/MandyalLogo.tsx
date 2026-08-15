type MandyalLogoProps = {
  appearance?: 'default' | 'inverse';
  className?: string;
  showTagline?: boolean;
  size?: 'compact' | 'standard' | 'hero';
};

export function MandyalLogo({
  appearance = 'default',
  className = '',
  showTagline = false,
  size = 'standard',
}: MandyalLogoProps) {
  const classes = [
    'mandyal-logo',
    `mandyal-logo--${appearance}`,
    `mandyal-logo--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      <svg
        aria-hidden="true"
        className="mandyal-logo__symbol"
        focusable="false"
        viewBox="0 0 64 64"
      >
        <rect className="mandyal-logo__background" height="60" rx="17" width="60" x="2" y="2" />
        <circle className="mandyal-logo__sun" cx="46" cy="17" r="5" />
        <path
          className="mandyal-logo__mountain mandyal-logo__mountain--back"
          d="M8 47 22 24l8 12 9-17 17 28H8Z"
        />
        <path
          className="mandyal-logo__snow"
          d="m17 33 5-9 5 8 3-4 3 5 6-14 8 13-5-4-3 5-4-4-5 7-8-6-5 7-4-4Z"
        />
        <path className="mandyal-logo__ground" d="M8 47h48v6H8z" />
        <path
          className="mandyal-logo__route"
          d="M18 52c1-8 13-7 14-15 .8 7 12 7 14 15"
          fill="none"
        />
      </svg>

      <span className="mandyal-logo__copy">
        <span className="mandyal-logo__name">
          <span>Mandyal</span> <strong>Travels</strong>
        </span>
        {showTagline ? (
          <span className="mandyal-logo__tagline">
            From the heart of the Himalayas to everywhere
          </span>
        ) : null}
      </span>
    </span>
  );
}
