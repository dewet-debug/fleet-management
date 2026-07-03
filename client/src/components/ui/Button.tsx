import React from 'react';
import clsx from 'clsx';

/**
 * Button — Signal variants.
 * primary   = steel-blue fill (main actions)
 * secondary = white + border (default / cancel)
 * danger    = red fill (destructive)
 * ghost     = text only (table actions, "View all →")
 *
 * `size` is retained for backwards compatibility with existing screens.
 */
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:   'bg-primary-500 text-white hover:bg-primary-600 disabled:bg-primary-300',
  secondary: 'bg-paper-card text-ink-body border border-paper-line hover:bg-paper-sunken',
  danger:    'bg-danger text-white hover:brightness-95',
  ghost:     'bg-transparent text-primary-500 hover:text-primary-700 hover:bg-paper-sunken',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  className,
  ...rest
}) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-control transition-colors',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...rest}
    >
      {isLoading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-pill border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
};
