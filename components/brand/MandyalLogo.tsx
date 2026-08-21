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
        viewBox="0 0 96 64"
      >
        <rect className="mandyal-logo__background" height="60" rx="17" width="92" x="2" y="2" />
        <circle className="mandyal-logo__sun" cx="68" cy="17" r="8" />
        <path
          className="mandyal-logo__mountain mandyal-logo__mountain--back"
          d="M6 48 27 25l9 10 14-23 14 19 8-9 18 26H6Z"
        />
        <path
          className="mandyal-logo__snow"
          d="m21 32 6-7 6 7 3-3 4 5 10-22 11 15-6-5-5 7-4-5-7 12-6-5-5 6-4-3Z"
        />
        <path className="mandyal-logo__ground" d="M7 47h82v7H7z" />
        <path
          className="mandyal-logo__route"
          d="M25 54c3-10 19-9 23-19 1 9 17 9 22 19"
          fill="none"
        />
        <path className="mandyal-logo__bird" d="M78 17c3-3 6-3 9 0m-6 5c3-3 6-3 9 0" />
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
