import React from 'react';
import clsx from 'clsx';

type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple';

interface BadgeProps {
  color?: BadgeColor;
  children: React.ReactNode;
  className?: string;
}

const colorStyles: Record<BadgeColor, string> = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-800',
  purple: 'bg-purple-100 text-purple-800',
};

export const Badge: React.FC<BadgeProps> = ({
  color = 'gray',
  children,
  className,
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorStyles[color],
        className
      )}
    >
      {children}
    </span>
  );
};
