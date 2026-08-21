import Image from 'next/image';

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
      <Image
        alt={
          showTagline
            ? 'Mandyal Travels — From the heart of the Himalayas to everywhere'
            : 'Mandyal Travels'
        }
        className="mandyal-logo__artwork"
        height={420}
        priority={size === 'hero'}
        sizes={
          size === 'hero' ? '(max-width: 700px) 88vw, 610px' : '(max-width: 700px) 184px, 275px'
        }
        src="/brand/mandyal-travels-signature.png"
        width={1885}
      />
    </span>
  );
}
