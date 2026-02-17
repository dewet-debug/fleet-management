import React from 'react';
import clsx from 'clsx';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data available.',
}: TableProps<T>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {isLoading &&
            Array.from({ length: 5 }).map((_, rowIdx) => (
              <tr key={`skeleton-${rowIdx}`}>
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4">
                    <div
                      className={clsx(
                        'h-4 animate-pulse rounded bg-gray-200',
                        rowIdx % 2 === 0 ? 'w-3/4' : 'w-1/2'
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}

          {!isLoading && data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center text-sm text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}

          {!isLoading &&
            data.map((item, rowIdx) => (
              <tr
                key={rowIdx}
                className="transition-colors hover:bg-gray-50"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="whitespace-nowrap px-6 py-4 text-sm text-gray-900"
                  >
                    {col.render
                      ? col.render(item)
                      : (item[col.key] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
