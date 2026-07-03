import React from 'react';
import clsx from 'clsx';

/**
 * Card — the base surface. White, hairline border, no shadow (Signal
 * prefers borders). Optional header row with title + subtitle + right-slot actions.
 *
 * Body keeps default padding for backwards compatibility. For flush content
 * (e.g. a table that should reach the card edges) pass `bodyClassName="p-0"`.
 */
interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  className,
  bodyClassName = 'p-pad',
  children,
}) => {
  return (
    <div className={clsx('overflow-hidden rounded-card border border-paper-line bg-paper-card shadow-card', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-paper-hair px-pad py-3.5">
          <div className="flex items-baseline gap-2.5">
            {title && <span className="text-lg font-bold text-ink">{title}</span>}
            {subtitle && <span className="font-mono text-xs text-ink-faint">{subtitle}</span>}
          </div>
          {actions}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
};

/** KPI stat cell — use inside a bordered grid for the dashboard / Bolt cards. */
export function Stat({
  label,
  value,
  sub,
  valueClassName = 'text-ink-strong',
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3.5">
      <span className="font-mono text-meta uppercase text-ink-ghost">{label}</span>
      <span className={clsx('font-mono text-stat font-semibold', valueClassName)}>{value}</span>
      {sub && <span className="text-xs text-ink-ghost">{sub}</span>}
    </div>
  );
}
