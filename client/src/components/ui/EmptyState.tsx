import React from 'react';
import clsx from 'clsx';
import { Button } from './Button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-gray-400">{icon}</div>
      )}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          <Button variant="primary" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
};
