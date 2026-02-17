import React from 'react';
import clsx from 'clsx';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (current > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('ellipsis');
  }

  pages.push(total);

  return pages;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={clsx(
          'inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          page <= 1
            ? 'cursor-not-allowed text-gray-300'
            : 'text-gray-700 hover:bg-gray-100'
        )}
        aria-label="Previous page"
      >
        <HiChevronLeft className="h-4 w-4 mr-1" />
        Previous
      </button>

      {pageNumbers.map((p, idx) =>
        p === 'ellipsis' ? (
          <span
            key={`ellipsis-${idx}`}
            className="px-3 py-2 text-sm text-gray-500"
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={clsx(
              'inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              p === page
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            )}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Page ${p}`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={clsx(
          'inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          page >= totalPages
            ? 'cursor-not-allowed text-gray-300'
            : 'text-gray-700 hover:bg-gray-100'
        )}
        aria-label="Next page"
      >
        Next
        <HiChevronRight className="h-4 w-4 ml-1" />
      </button>
    </nav>
  );
};
