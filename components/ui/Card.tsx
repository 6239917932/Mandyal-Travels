import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  elevated?: boolean;
  padded?: boolean;
}

export function Card({
  children,
  className = '',
  elevated = false,
  padded = true,
  ...props
}: CardProps) {
  const classes = [
    'ui-card',
    padded ? 'ui-card--padded' : '',
    elevated ? 'ui-card--elevated' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes} {...props}>
      {children}
    </section>
  );
}
