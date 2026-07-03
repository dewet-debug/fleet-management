import React from 'react';
import clsx from 'clsx';
import { statusMeta, StatusKind, Semantic } from '../../theme/status';

/**
 * Badge — Signal status pill: tinted background + matching text + a leading dot.
 *
 * Preferred usage (colour is automatic, meaning stays consistent):
 *   <StatusBadge kind="vehicle" value="ACTIVE" />
 *
 * Semantic escape hatch:
 *   <Badge tone="success">Custom</Badge>
 *
 * Legacy `color` prop is still supported so existing screens keep working;
 * it maps onto the same semantic palette.
 */
type Tone = Semantic;
type LegacyColor = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple';

const TONE: Record<Tone, string> = {
  success: 'text-success bg-success-bg',
  warning: 'text-warning bg-warning-bg',
  info:    'text-info bg-info-bg',
  danger:  'text-danger bg-danger-bg',
  neutral: 'text-neutral bg-neutral-bg',
};

const LEGACY_TO_TONE: Record<LegacyColor, Tone> = {
  green: 'success',
  yellow: 'warning',
  blue: 'info',
  red: 'danger',
  gray: 'neutral',
  purple: 'info',
};

interface BadgeProps {
  tone?: Tone;
  /** @deprecated use `tone` — retained for backwards compatibility */
  color?: LegacyColor;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ tone, color, dot = true, className, children }) => {
  const resolved: Tone = tone ?? (color ? LEGACY_TO_TONE[color] : 'neutral');
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold',
        TONE[resolved],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-pill bg-current" />}
      {children}
    </span>
  );
};

export function StatusBadge({
  kind,
  value,
  dot = true,
}: {
  kind: StatusKind;
  value: string;
  dot?: boolean;
}) {
  const meta = statusMeta(kind, value);
  return (
    <Badge tone={meta.sem} dot={dot}>
      {meta.label}
    </Badge>
  );
}
